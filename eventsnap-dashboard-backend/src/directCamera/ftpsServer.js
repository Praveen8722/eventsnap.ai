import net from "net";
import tls from "tls";
import path from "path";
import { once } from "events";
import { authenticate, ingestPhoto, renameStoredPhoto, stillAuthorized } from "./ingest.js";

// Minimal FTPS (explicit TLS, RFC 4217) receiver for Direct Camera Auto
// Upload. It implements only what cameras need to upload photos — there is
// no real file system behind it: folders are virtual, listings are empty,
// and every stored file goes straight into the event's gallery.
//
// Security rules:
//   • TLS is required before USER/PASS (AUTH TLS), and data transfers must
//     be encrypted (PROT P) — credentials and photos never travel in clear.
//   • Passive mode only; a data connection must come from the same IP as
//     the control connection.
//   • Repeated failed logins block the IP for a while; connection counts are
//     capped overall and per IP; idle sessions are closed.
//   • Passwords are never logged.

const CRLF = "\r\n";
const MAX_LINE = 1024;

const normalizeIp = (ip) => String(ip || "").replace(/^::ffff:/, "");

export const createFtpsServer = ({
  secureContext,
  // TLS for data connections. Node can't answer a client-initiated TLS 1.3
  // shutdown with close_notify, so strict FTPS clients see an "unclean"
  // end of every upload — data connections use a TLS 1.2 context.
  dataSecureContext = secureContext,
  pasvAddress, // public IPv4 sent in PASV replies (defaults to the server's local address)
  pasvPortMin = 30000,
  pasvPortMax = 30009,
  maxConnections = 100,
  maxPerIp = 10,
  idleMs = 5 * 60 * 1000,
  dataTimeoutMs = 60 * 1000,
  maxFailedLogins = 5,
  blockMs = 15 * 60 * 1000,
  log = (...args) => console.log("[direct-camera]", ...args),
}) => {
  const perIp = new Map();
  const failures = new Map(); // ip → { count, first, blockedUntil }
  const usedPasvPorts = new Set();
  let total = 0;

  const isBlocked = (ip) => (failures.get(ip)?.blockedUntil || 0) > Date.now();
  const noteFailure = (ip) => {
    const now = Date.now();
    const f = failures.get(ip);
    const entry = !f || now - f.first > blockMs ? { count: 0, first: now, blockedUntil: 0 } : f;
    entry.count += 1;
    if (entry.count >= maxFailedLogins) {
      entry.blockedUntil = now + blockMs;
      log(`blocking ${ip} for ${Math.round(blockMs / 60000)} min after ${entry.count} failed logins`);
    }
    failures.set(ip, entry);
  };

  const server = net.createServer((raw) => {
    const ip = normalizeIp(raw.remoteAddress);
    if (total >= maxConnections || (perIp.get(ip) || 0) >= maxPerIp || isBlocked(ip)) {
      raw.end(`421 Too many connections or temporarily blocked${CRLF}`);
      return;
    }
    total += 1;
    perIp.set(ip, (perIp.get(ip) || 0) + 1);
    raw.once("close", () => {
      total -= 1;
      const left = (perIp.get(ip) || 1) - 1;
      if (left) perIp.set(ip, left);
      else perIp.delete(ip);
    });
    new Session(raw, ip);
  });

  class Session {
    constructor(raw, ip) {
      this.raw = raw;
      this.sock = raw;
      this.ip = ip;
      this.secure = false;
      this.protP = false;
      this.userName = null;
      this.config = null;
      this.cwd = "/";
      this.pasv = null;
      this.renameFrom = null;
      this.stored = new Map(); // file name → photo url (this session's uploads)
      this.busy = false;
      this.buffer = "";
      this.queue = Promise.resolve();
      this.closed = false;

      raw.setNoDelay(true);
      raw.on("error", () => {});
      raw.on("close", () => this.cleanup());
      raw.setTimeout(idleMs, () => {
        if (this.busy) return;
        this.reply(421, "Idle timeout");
        this.close();
      });
      this.attach(raw);
      this.reply(220, "EventSnap Direct Camera FTPS ready");
    }

    attach(sock) {
      sock.on("data", (chunk) => {
        this.buffer += chunk.toString("utf8");
        if (this.buffer.length > MAX_LINE * 4) return this.close();
        let i;
        while ((i = this.buffer.indexOf("\n")) >= 0) {
          const line = this.buffer.slice(0, i).replace(/\r$/, "");
          this.buffer = this.buffer.slice(i + 1);
          if (line.length > MAX_LINE) return this.close();
          this.queue = this.queue.then(() => this.handle(line)).catch(() => this.close());
        }
      });
    }

    reply(code, text) {
      if (this.closed || this.sock.destroyed) return;
      this.sock.write(`${code} ${text}${CRLF}`);
    }

    close() {
      if (this.closed) return;
      this.closed = true;
      this.closePassive();
      this.sock.end();
      setTimeout(() => this.raw.destroy(), 2000).unref();
    }

    cleanup() {
      this.closed = true;
      this.closePassive();
    }

    resolvePath(arg) {
      const p = path.posix.normalize(path.posix.isAbsolute(arg || "") ? arg : path.posix.join(this.cwd, arg || ""));
      return p.length > 512 ? this.cwd : p.replace(/\/+$/, "") || "/";
    }

    // ---- passive data connections ----
    closePassive() {
      if (!this.pasv) return;
      const { server: s, port, timer } = this.pasv;
      clearTimeout(timer);
      s.close();
      usedPasvPorts.delete(port);
      this.pasv?.socket?.destroy();
      this.pasv = null;
    }

    async openPassive() {
      this.closePassive();
      const ports = [];
      for (let p = pasvPortMin; p <= pasvPortMax; p++) if (!usedPasvPorts.has(p)) ports.push(p);
      ports.sort(() => Math.random() - 0.5);
      for (const port of ports) {
        // allowHalfOpen: when the client finishes sending (its TLS
        // close_notify), Node must not tear the connection down by itself —
        // closeData() answers with our close_notify first (small files
        // otherwise race and the client sees an unclean TLS shutdown).
        const s = net.createServer({ allowHalfOpen: true });
        try {
          await new Promise((resolve, reject) => {
            s.once("error", reject);
            s.listen(port, resolve);
          });
        } catch {
          continue;
        }
        usedPasvPorts.add(port);
        const pasv = { server: s, port, socket: null };
        pasv.ready = new Promise((resolve) => {
          pasv.timer = setTimeout(() => resolve(null), dataTimeoutMs);
          s.on("connection", (sock) => {
            // Only the client that opened this session may use its data port.
            if (normalizeIp(sock.remoteAddress) !== this.ip || pasv.socket) {
              sock.destroy();
              return;
            }
            sock.on("error", () => {});
            pasv.socket = sock;
            clearTimeout(pasv.timer);
            s.close();
            resolve(sock);
          });
        });
        this.pasv = pasv;
        return port;
      }
      return null;
    }

    // The data connection for the next transfer, TLS-wrapped (PROT P).
    async dataSocket() {
      const pasv = this.pasv;
      if (!pasv) return null;
      const sock = await pasv.ready;
      if (!sock) return null;
      sock.setTimeout(dataTimeoutMs, () => sock.destroy());
      return sock;
    }

    async secureData(sock) {
      const t = new tls.TLSSocket(sock, { isServer: true, secureContext: dataSecureContext });
      t.on("error", () => {});
      await Promise.race([
        once(t, "secure"),
        new Promise((_, reject) => setTimeout(() => reject(new Error("TLS timeout")), dataTimeoutMs).unref()),
      ]);
      return t;
    }

    // Ends a TLS data connection cleanly (sends close_notify — FTPS clients
    // check for it after a transfer), then frees it.
    async closeData(t) {
      if (!t.destroyed) {
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, 2000);
          t.end(() => {
            clearTimeout(timer);
            resolve();
          });
        });
      }
      setTimeout(() => t.destroy(), 1000).unref();
    }

    finishTransfer() {
      this.closePassive();
      this.busy = false;
    }

    // ---- commands ----
    async handle(line) {
      if (this.closed) return;
      const space = line.indexOf(" ");
      const cmd = (space < 0 ? line : line.slice(0, space)).toUpperCase();
      const arg = space < 0 ? "" : line.slice(space + 1);

      switch (cmd) {
        case "AUTH": {
          if (this.secure) return this.reply(503, "Already using TLS");
          if (!/^(TLS|SSL|TLS-C)$/i.test(arg)) return this.reply(504, "Use AUTH TLS");
          this.reply(234, "Proceed with TLS negotiation");
          this.raw.removeAllListeners("data");
          const t = new tls.TLSSocket(this.raw, { isServer: true, secureContext });
          t.on("error", () => this.close());
          this.sock = t;
          this.secure = true;
          this.attach(t);
          return;
        }
        case "FEAT":
          this.sock.write(`211-Features:${CRLF} AUTH TLS${CRLF} PBSZ${CRLF} PROT${CRLF} PASV${CRLF} EPSV${CRLF} UTF8${CRLF}211 End${CRLF}`);
          return;
        case "SYST":
          return this.reply(215, "UNIX Type: L8");
        case "NOOP":
          return this.reply(200, "OK");
        case "QUIT":
          this.reply(221, "Goodbye");
          return this.close();
        case "OPTS":
          return /^UTF8\b/i.test(arg) ? this.reply(200, "UTF8 mode on") : this.reply(501, "Option not supported");
        case "CLNT":
          return this.reply(200, "OK");
      }

      if (!this.secure) return this.reply(530, "Use AUTH TLS before logging in (FTPS required)");

      switch (cmd) {
        case "PBSZ":
          return this.reply(200, "PBSZ=0");
        case "PROT":
          if (/^P$/i.test(arg)) {
            this.protP = true;
            return this.reply(200, "Data protection level set to Private");
          }
          return this.reply(536, "Only PROT P (encrypted data) is allowed");
        case "USER":
          if (this.config) return this.reply(503, "Already logged in");
          this.userName = arg.trim();
          return this.reply(331, "Password required");
        case "PASS": {
          if (this.config) return this.reply(503, "Already logged in");
          if (!this.userName) return this.reply(503, "Send USER first");
          if (isBlocked(this.ip)) {
            this.reply(421, "Too many failed logins — try again later");
            return this.close();
          }
          const result = await authenticate(this.userName, arg).catch(() => ({ error: "server" }));
          if (result.config) {
            this.config = result.config;
            log(`login ok user=${this.userName} ip=${this.ip}`);
            return this.reply(230, "Logged in — photos will be added to your EventSnap event");
          }
          if (result.error === "server") return this.reply(421, "Service temporarily unavailable");
          // Only wrong passwords count towards blocking — not a correct login
          // for a paused/removed event (a camera retrying while uploads are
          // off mustn't get its IP blocked once they're back on).
          if (result.error === "invalid") noteFailure(this.ip);
          log(`login failed user=${this.userName} ip=${this.ip} reason=${result.error}`);
          await new Promise((r) => setTimeout(r, 1000));
          return this.reply(530, result.error === "disabled" ? "Direct camera upload is turned off for this event" : "Login incorrect");
        }
      }

      if (!this.config) return this.reply(530, "Please log in with USER and PASS");

      switch (cmd) {
        case "PWD":
        case "XPWD":
          return this.reply(257, `"${this.cwd.replace(/"/g, '""')}" is the current directory`);
        case "CWD":
        case "XCWD":
          this.cwd = this.resolvePath(arg);
          return this.reply(250, "Directory changed");
        case "CDUP":
        case "XCUP":
          this.cwd = this.resolvePath("..");
          return this.reply(250, "Directory changed");
        case "MKD":
        case "XMKD":
          return this.reply(257, `"${this.resolvePath(arg).replace(/"/g, '""')}" created`);
        case "RMD":
        case "XRMD":
          return this.reply(250, "OK");
        case "TYPE":
          return /^[AI]/i.test(arg) ? this.reply(200, "Type set") : this.reply(504, "Type not supported");
        case "MODE":
          return /^S$/i.test(arg) ? this.reply(200, "Mode set") : this.reply(504, "Only stream mode");
        case "STRU":
          return /^F$/i.test(arg) ? this.reply(200, "Structure set") : this.reply(504, "Only file structure");
        case "ALLO":
          return this.reply(202, "No storage allocation necessary");
        case "STAT":
          return this.reply(211, "EventSnap Direct Camera FTPS");
        case "PASV": {
          const port = await this.openPassive();
          if (!port) return this.reply(425, "No passive ports available — try again");
          const address = (pasvAddress || normalizeIp(this.raw.localAddress)).split(".");
          if (address.length !== 4) return this.reply(425, "Passive address not configured");
          return this.reply(227, `Entering Passive Mode (${address.join(",")},${port >> 8},${port & 255})`);
        }
        case "EPSV": {
          if (/^ALL$/i.test(arg)) return this.reply(200, "EPSV ALL ok");
          const port = await this.openPassive();
          if (!port) return this.reply(425, "No passive ports available — try again");
          return this.reply(229, `Entering Extended Passive Mode (|||${port}|)`);
        }
        case "PORT":
        case "EPRT":
          return this.reply(502, "Active mode isn't supported — turn on Passive mode in the camera's FTP settings");
        case "SIZE":
        case "MDTM":
        case "MLST":
          return this.reply(550, "File not available");
        case "DELE":
          return this.reply(550, "Deleting isn't allowed");
        case "REST":
          return this.reply(502, "Resume isn't supported");
        case "APPE":
        case "STOU":
          return this.reply(502, "Not supported — use STOR");
        case "RNFR":
          this.renameFrom = path.posix.basename(arg || "");
          return this.reply(350, "Ready for destination name");
        case "RNTO": {
          const from = this.renameFrom;
          this.renameFrom = null;
          if (!from) return this.reply(503, "Send RNFR first");
          const url = this.stored.get(from);
          if (url) {
            await renameStoredPhoto(this.config, url, path.posix.basename(arg || ""));
            this.stored.delete(from);
            this.stored.set(path.posix.basename(arg || ""), url);
          }
          return this.reply(250, "Rename successful");
        }
        case "LIST":
        case "NLST":
        case "MLSD":
          return this.emptyListing();
        case "STOR":
          return this.store(arg);
        default:
          return this.reply(502, "Command not implemented");
      }
    }

    async emptyListing() {
      if (!this.protP) return this.reply(521, "Data connections must be encrypted (PROT P)");
      this.busy = true;
      const sock = await this.dataSocket();
      if (!sock) {
        this.finishTransfer();
        return this.reply(425, "Can't open data connection (use PASV)");
      }
      this.reply(150, "Here comes the directory listing");
      try {
        const t = await this.secureData(sock);
        await this.closeData(t);
        this.reply(226, "Directory send OK");
      } catch {
        sock.destroy();
        this.reply(425, "TLS negotiation on the data connection failed");
      }
      this.finishTransfer();
    }

    async store(arg) {
      if (!this.protP) return this.reply(521, "Data connections must be encrypted (PROT P)");
      const fileName = path.posix.basename(String(arg || "").replace(/\\/g, "/"));
      if (!fileName) return this.reply(501, "File name required");
      // The login may have been revoked or regenerated since this session started.
      if (!(await stillAuthorized(this.config).catch(() => false))) {
        this.reply(530, "These camera credentials are no longer valid");
        return this.close();
      }
      this.busy = true;
      const sock = await this.dataSocket();
      if (!sock) {
        this.finishTransfer();
        return this.reply(425, "Can't open data connection (use PASV)");
      }
      this.reply(150, "Ok to send data");
      let source;
      try {
        source = await this.secureData(sock);
      } catch {
        sock.destroy();
        this.finishTransfer();
        return this.reply(425, "TLS negotiation on the data connection failed");
      }
      const result = await ingestPhoto({ config: this.config, fileName, source }).catch(() => ({ status: "failed", reason: "Server error" }));
      await this.closeData(source);
      this.finishTransfer();
      log(`upload ${result.status} file=${fileName} user=${this.userName}${result.reason ? ` reason=${result.reason}` : ""}`);
      if (result.status === "stored" || result.status === "duplicate") {
        if (result.url) this.stored.set(fileName, result.url);
        return this.reply(226, result.status === "duplicate" ? "Transfer complete (already received)" : "Transfer complete");
      }
      if (result.status === "rejected") return this.reply(/Larger/.test(result.reason) ? 552 : 553, result.reason);
      return this.reply(451, `${result.reason} — please retry`);
    }
  }

  return server;
};
