// timer-app.js - CON Log de Eventos, SIN notificaciones de sistema para eventos
document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const clockElement = document.getElementById('clock');
    const morningShiftBtn = document.getElementById('morning-shift-btn');
    const afternoonShiftBtn = document.getElementById('afternoon-shift-btn');
    const scheduleTitle = document.getElementById('schedule-title');
    const taskListUl = document.getElementById('task-list');
    const timerTaskName = document.getElementById('timer-task-name');
    const timerDisplay = document.getElementById('timer-display');
    // const stopTimerBtn = document.getElementById('stop-timer-btn'); // No usado activamente
    const notificationPermissionBtn = document.getElementById('request-notification-permission');
    const timerEndSound = document.getElementById('timer-end-sound');
    const refReminderSound = document.getElementById('ref-reminder-sound');
    const muteCheckbox = document.getElementById('mute-checkbox');
    const logDisplay = document.getElementById('event-log-display'); // Contenedor del Log
    const clearLogBtn = document.getElementById('clear-log-btn'); // Botón limpiar log

    // --- Estado de la Aplicación ---
    let currentShift = null;
    let tasks = [];
    let activeTimerInterval = null;
    let remainingSeconds = 0;
    let activeTaskId = null;
    let activeButtonElement = null;
    let referenceReminderInterval = null;
    let remindedTasks = new Set();
    let isMuted = false;
    // const NOTIFICATION_DELAY = 700; // Ya no se usa para eventos
    const MAX_LOG_ENTRIES = 30; // Máximo de mensajes en el log

    // --- Inicialización ---
    function init() {
        updateClock(); setInterval(updateClock, 1000);
        morningShiftBtn.addEventListener('click', () => loadShift('morning'));
        afternoonShiftBtn.addEventListener('click', () => loadShift('afternoon'));
        muteCheckbox.addEventListener('change', handleMuteChange);
        clearLogBtn.addEventListener('click', clearLog); // Listener para limpiar log

        loadMuteState();
        const lastShift = localStorage.getItem('lastShift');
        if (lastShift) { loadShift(lastShift); }
        setupNotificationButton(); // Mantenemos por si el usuario quiere permiso para futuras features
        addLogMessage("Aplicación iniciada."); // Mensaje inicial en log
    }

    // --- Log de Eventos ---
    function addLogMessage(message) {
        if (!logDisplay) return;
        const now = new Date();
        const timestamp = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const logEntry = document.createElement('p');
        logEntry.style.margin = '2px 0';
        logEntry.innerHTML = `<strong>[${timestamp}]</strong> ${message}`; // Usar innerHTML para negrita

        // Añadir al principio (más nuevo arriba)
        logDisplay.insertBefore(logEntry, logDisplay.firstChild);

        // Limitar tamaño del log
        while (logDisplay.childElementCount > MAX_LOG_ENTRIES) {
            logDisplay.removeChild(logDisplay.lastChild);
        }
    }

     function clearLog() {
         if(logDisplay) {
             logDisplay.innerHTML = ''; // Limpiar contenido
             addLogMessage("Registro limpiado.");
         }
     }


    // --- Silencio (Mute) ---
    function loadMuteState() { /* Sin cambios */ }
    function handleMuteChange() { /* Sin cambios */ }

    // --- Reloj ---
    function updateClock() { /* Sin cambios */ }

    // --- Carga de Turnos y Tareas ---
    function loadShift(shiftName) { /* Sin cambios */ }
    function renderTaskList() { /* Sin cambios respecto a la última versión CON task-actions */ }
    function getTaskDurationMinutes(task) { /* Sin cambios */ }
    function getTimerDurationSeconds(task) { /* Sin cambios */ }

    // --- Completado de Tareas ---
    function toggleTaskCompletion(taskId, isCompleted) { /* Sin cambios */ }
    function getCompletedTasks() { /* Sin cambios */ }
    function saveCompletedTasks(completedSet) { /* Sin cambios */ }

    // --- Lógica del Timer ---
    function startTimer(taskId, buttonElement) { // MODIFICADO: Añadir log
        if (activeTimerInterval) { stopCurrentTimer(); }
        const task = tasks.find(t => t.id === taskId); if (!task) { console.error("Task not found:", taskId); return; }
        const durationSeconds = getTimerDurationSeconds(task); if (durationSeconds <= 0) { alert(`La tarea "${task.name}" no tiene duración.`); return; }
        activeTaskId = taskId; activeButtonElement = buttonElement; remainingSeconds = durationSeconds; timerTaskName.textContent = task.name; updateTimerDisplay();
        activeButtonElement.textContent = 'Detener'; activeButtonElement.classList.remove('start-timer-btn'); activeButtonElement.classList.add('stop-active-timer-btn');
        activeButtonElement.onclick = () => stopCurrentTimer();
        document.querySelectorAll('.start-timer-btn').forEach(btn => { if (btn !== activeButtonElement) { btn.disabled = true; } });
        document.querySelectorAll('#task-list li').forEach(li => { li.classList.remove('active-timer'); li.classList.remove('current-reference-time'); });
        const activeLi = document.getElementById(taskId); if (activeLi) { activeLi.classList.add('active-timer'); }
        vibrateDevice(100); // Vibrar al iniciar (respeta mute)
        addLogMessage(`Timer iniciado: ${task.name}`); // <<< Log añadido
        activeTimerInterval = setInterval(() => { remainingSeconds--; updateTimerDisplay(); if (remainingSeconds < 0) { timerFinished(task); } }, 1000);
        console.log(`Timer started for: ${task.name}`);
    }

    function stopCurrentTimer() { // MODIFICADO: Añadir log
        if (!activeTimerInterval && !activeTaskId) return;
        const manualStop = !!activeTimerInterval; // Fue parada manualmente si el intervalo existía
        if (activeTimerInterval) { clearInterval(activeTimerInterval); activeTimerInterval = null; }
        const previouslyActiveTaskId = activeTaskId; const previouslyActiveButton = activeButtonElement;
        activeTaskId = null; remainingSeconds = 0; activeButtonElement = null; timerTaskName.textContent = 'Ninguna'; timerDisplay.textContent = '--:--';
        if (previouslyActiveTaskId) {
            const activeLi = document.getElementById(previouslyActiveTaskId);
            if (activeLi) { activeLi.classList.remove('active-timer'); const miniTimer = activeLi.querySelector('.mini-timer-display'); if (miniTimer) { miniTimer.style.display = 'none'; } }
            if (previouslyActiveButton) { previouslyActiveButton.textContent = 'Iniciar Timer'; previouslyActiveButton.classList.remove('stop-active-timer-btn'); previouslyActiveButton.classList.add('start-timer-btn'); previouslyActiveButton.onclick = () => startTimer(previouslyActiveTaskId, previouslyActiveButton); }
        }
        document.querySelectorAll('button.start-timer-btn, button.stop-active-timer-btn').forEach(btn => { if(btn.classList.contains('start-timer-btn')) { btn.disabled = false; } });
        checkReferenceTimes();
        if (manualStop) { // Solo loguear si fue parada por el usuario, no al finalizar
             addLogMessage('Timer detenido manualmente.'); // <<< Log añadido
        }
        console.log("Timer stopped.");
    }

    function updateTimerDisplay() { /* Sin cambios */ }

    function timerFinished(task) { // MODIFICADO: Quitar showNotification, añadir log
        const taskName = task ? task.name : "Tarea desconocida";
        vibrateDevice([200, 100, 200]); // Vibrar (respeta mute)
        playTimerEndSound();            // Sonido (respeta mute)
        const wasActiveTaskId = activeTaskId; // Guardar ID porque stopCurrentTimer lo limpia
        stopCurrentTimer(); // Limpia intervalo, etc.

        const message = `¡Tiempo completado para: ${taskName}!`;
        alert(message); // Mantenemos el alert bloqueante por ahora
        addLogMessage(`Timer finalizado: ${taskName}`); // <<< Log añadido
        // La llamada a showNotification se elimina
        // setTimeout(() => { showNotification("Timer Finalizado", message); }, NOTIFICATION_DELAY);
        console.log(message);
    }

    // --- Sonidos ---
    function playTimerEndSound() { /* Sin cambios */ }
    function playRefReminderSound() { /* Sin cambios */ }

    // --- Vibración ---
    function vibrateDevice(pattern) { /* Sin cambios */ }

    // --- Lógica de Recordatorios de Referencia ---
    function startReferenceReminders() { /* Sin cambios */ }
    function stopReferenceReminders() { /* Sin cambios */ }
    function checkReferenceTimes() { /* Sin cambios */ }

    function showReferenceReminder(task) { // MODIFICADO: Quitar showNotification, añadir log
        if (!task) return;
        console.log(`Recordatorio de referencia: ${task.time} - ${task.name}`);
        playRefReminderSound(); // Sonido (respeta mute)
        vibrateDevice(50); // Vibración (respeta mute)
        addLogMessage(`Recordatorio ref: ${task.name} (${task.time})`); // <<< Log añadido
        // La llamada a showNotification se elimina
        // setTimeout(() => { showNotification("Recordatorio SMAPD", `Referencia: ${task.time} - ${task.name}`); }, NOTIFICATION_DELAY);
    }

    // --- Notificaciones del Sistema (Se mantiene la lógica de permisos, pero no se llama para eventos) ---
    function setupNotificationButton() { /* Sin cambios */ }
    // La función showNotification se mantiene por si se usa al aceptar permisos, pero ya no se llama desde timerFinished ni showReferenceReminder
    function showNotification(title, body) { /* Sin cambios */ }

    // --- Service Worker (PWA) ---
    if ('serviceWorker' in navigator) { /* Sin cambios */ } else { console.log("Service workers no soportados."); }

    // --- Iniciar la aplicación ---
    init();
});