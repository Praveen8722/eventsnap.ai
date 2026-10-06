package ai.eventsnap.camera

import java.util.concurrent.CopyOnWriteArrayList

/** Live auto-upload status shared by the service, its notification and the screen. */
object Status {
    data class State(
        val running: Boolean = false,
        val eventName: String = "",
        val phase: String = "Stopped",
        val uploaded: Int = 0,
        val skipped: Int = 0,
        val waiting: Int = 0,
        val failed: Int = 0,
        val last: String = "",
        val error: String = "",
    )

    @Volatile
    var state = State()
        private set

    private val listeners = CopyOnWriteArrayList<(State) -> Unit>()

    fun update(change: (State) -> State) {
        state = change(state)
        listeners.forEach { it(state) }
    }

    fun listen(listener: (State) -> Unit) {
        listeners.add(listener)
    }

    fun unlisten(listener: (State) -> Unit) {
        listeners.remove(listener)
    }
}
