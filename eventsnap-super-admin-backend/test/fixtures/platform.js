import mongoose from 'mongoose';

/**
 * A small EventSnap platform database (the photographer dashboard's collections and fields), used
 * to check the admin figures. Dates are relative to `now`; "this month" items are a minute old.
 */

const GB = 1024 ** 3;
const DAY = 86_400_000;
const oid = () => new mongoose.Types.ObjectId();

export function buildPlatformFixture(now = new Date()) {
  const ago = ms => new Date(now.getTime() - ms);
  const justNow = ago(60_000);
  const ids = { asha: oid(), vikram: oid(), pixel: oid() };

  const users = [
    { _id: ids.asha, name: 'Asha Rao', businessName: 'Asha Studio', email: 'asha@studio.in', phone: '9000000001', password: '$2b$10$not-a-real-hash', dismissedNotifications: [], createdAt: ago(200 * DAY), updatedAt: ago(2 * DAY) },
    { _id: ids.vikram, name: 'Vikram Mehta', businessName: '', email: 'vikram@lens.in', phone: '9000000002', password: '$2b$10$not-a-real-hash', createdAt: ago(40 * DAY), updatedAt: ago(40 * DAY) },
    { _id: ids.pixel, name: 'Pia', businessName: 'New Pixel', email: 'pia@pixel.in', phone: '9000000003', password: '$2b$10$not-a-real-hash', createdAt: justNow, updatedAt: justNow },
  ];

  const portfolios = [
    {
      user: ids.asha, slug: 'asha-studio', location: 'Mumbai, Maharashtra', services: [{ title: 'Weddings' }, { title: 'Portraits' }],
      testimonials: [{ rating: 5, review: 'Great' }, { rating: 4, review: 'Good' }], settings: { published: true }, updatedAt: ago(5 * DAY),
    },
    { user: ids.vikram, slug: 'lens-light', location: 'Pune', services: [], testimonials: [], settings: { published: false }, updatedAt: ago(40 * DAY) },
  ];

  const storageusages = [{ user: ids.asha, used: Math.round(2.8 * GB), holds: [], version: 3, updatedAt: ago(2 * DAY) }];

  const face = Buffer.alloc(128, 1);
  const createevents = [
    {
      user: ids.asha, name: 'Rahul & Priya', slug: 'evt-1', date: ago(10 * DAY), status: 'Live', createdAt: ago(20 * DAY),
      photos: [
        { _id: oid(), url: '/p/1', size: 1000, thumbSize: 100, faces: [face], createdAt: ago(3 * DAY) },
        { _id: oid(), url: '/p/2', size: 2000, thumbSize: 0, faces: [], createdAt: ago(2 * DAY) },
      ],
    },
    { user: ids.asha, name: 'Studio Shoot', slug: 'evt-2', date: ago(5 * DAY), status: 'Draft', createdAt: ago(6 * DAY), photos: [] },
    {
      user: ids.vikram, name: 'Mehta Reception', slug: 'evt-3', date: ago(39 * DAY), status: 'Live', createdAt: ago(39 * DAY),
      photos: [{ _id: oid(), url: '/p/3', size: Math.round(3.5 * GB), thumbSize: 0, faces: [], createdAt: ago(39 * DAY) }],
    },
  ];

  const bookings = [
    {
      user: ids.asha, bookingId: 'BK001', clientName: 'Rahul Sharma', email: 'rahul@gmail.com', phone: '9876543210', eventType: 'Wedding',
      eventDate: ago(-30 * DAY), packageSelected: 'Gold', packegPrice: 100000, advancePayment: 20000, payments: [{ amount: 30000, date: justNow }],
      eventDays: [{ name: 'Wedding', date: ago(-30 * DAY), location: 'Mumbai' }], source: 'internal', status: 'Confirmed',
      statusHistory: [{ status: 'Inquiry', date: ago(100 * DAY) }, { status: 'Confirmed', date: ago(90 * DAY) }],
      additionalNotes: 'PRIVATE NOTE', createdAt: ago(100 * DAY), updatedAt: justNow,
    },
    {
      user: ids.asha, bookingId: 'BK002', clientName: 'Rahul Sharma', email: '', phone: '+91 98765 43210', eventType: 'Engagement',
      eventDate: ago(20 * DAY), packageSelected: 'Silver', packegPrice: 50000, advancePayment: 50000, payments: [], eventDays: [],
      source: 'internal', status: 'Delivered', statusHistory: [{ status: 'Inquiry', date: ago(50 * DAY) }, { status: 'Delivered', date: ago(10 * DAY) }],
      createdAt: ago(50 * DAY), updatedAt: ago(10 * DAY),
    },
    {
      user: ids.asha, bookingId: 'BK003', clientName: 'Neha Kapoor', email: 'neha@example.com', phone: '', eventType: 'Birthday',
      eventDate: ago(-60 * DAY), packageSelected: 'Basic', packegPrice: 20000, advancePayment: 0, payments: [], eventDays: [],
      source: 'portfolio', status: 'Inquiry', statusHistory: [{ status: 'Inquiry', date: justNow }], createdAt: justNow, updatedAt: justNow,
    },
    {
      user: ids.vikram, bookingId: 'BK001', clientName: 'Rahul Sharma', email: 'rahul@gmail.com', phone: '9876543210', eventType: 'wedding',
      eventDate: ago(30 * DAY), packageSelected: 'Classic', packegPrice: 80000, advancePayment: 10000, payments: [], eventDays: [],
      source: 'internal', status: 'Cancelled', statusHistory: [{ status: 'Inquiry', date: ago(45 * DAY) }, { status: 'Cancelled', date: ago(44 * DAY) }],
      createdAt: ago(45 * DAY), updatedAt: ago(44 * DAY),
    },
    {
      user: null, bookingId: 'BK010', clientName: 'Old Client', email: 'old@example.com', phone: '9111111111', eventType: 'Portrait',
      eventDate: ago(400 * DAY), packageSelected: 'Mini', packegPrice: 5000, advancePayment: 5000, payments: [], eventDays: [],
      status: 'Delivered', statusHistory: [], createdAt: ago(400 * DAY), updatedAt: ago(400 * DAY),
    },
  ];

  return { ids, collections: { users, portfolios, storageusages, createevents, bookings } };
}

/** Writes the fixture with a separate (writable) connection — the API itself only ever reads. */
export async function writePlatformFixture(uri, now = new Date()) {
  const fixture = buildPlatformFixture(now);
  const conn = await mongoose.createConnection(uri).asPromise();
  try {
    await conn.dropDatabase();
    for (const [name, docs] of Object.entries(fixture.collections)) await conn.collection(name).insertMany(docs);
  } finally {
    await conn.close();
  }
  return fixture;
}

/** A fingerprint of every platform document, to prove the API changed nothing. */
export async function platformFingerprint(uri) {
  const conn = await mongoose.createConnection(uri).asPromise();
  try {
    const parts = [];
    for (const name of (await conn.db.listCollections().toArray()).map(c => c.name).sort()) {
      const docs = await conn.collection(name).find().sort({ _id: 1 }).toArray();
      parts.push(name, JSON.stringify(docs));
    }
    return parts.join('|');
  } finally {
    await conn.close();
  }
}
