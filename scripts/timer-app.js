// timer-app.js - Con Timer Fijo (CSS) y Vibración
document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const clockElement = document.getElementById('clock');
    const morningShiftBtn = document.getElementById('morning-shift-btn');
    const afternoonShiftBtn = document.getElementById('afternoon-shift-btn');
    const scheduleTitle = document.getElementById('schedule-title');
    const taskListUl = document.getElementById('task-list');
    const timerTaskName = document.getElementById('timer-task-name');
    const timerDisplay = document.getElementById('timer-display');
    const stopTimerBtn = document.getElementById('stop-timer-btn');
    const notificationPermissionBtn = document.getElementById('request-notification-permission');
    const timerEndSound = document.getElementById('timer-end-sound');
    const refReminderSound = document.getElementById('ref-reminder-sound');
    const muteCheckbox = document.getElementById('mute-checkbox');

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
    const NOTIFICATION_DELAY = 3000;// 1 segundo de retraso para la notificación

    // --- Inicialización ---
    function init() { /* Sin cambios */
        updateClock(); setInterval(updateClock, 1000);
        morningShiftBtn.addEventListener('click', () => loadShift('morning'));
        afternoonShiftBtn.addEventListener('click', () => loadShift('afternoon'));
        muteCheckbox.addEventListener('change', handleMuteChange);
        loadMuteState(); const lastShift = localStorage.getItem('lastShift');
        if (lastShift) { loadShift(lastShift); } setupNotificationButton();
    }

    // --- Silencio (Mute) ---
    function loadMuteState() { /* Sin cambios */
        const savedMuteState = localStorage.getItem('isMuted'); isMuted = savedMuteState === 'true'; muteCheckbox.checked = isMuted; console.log("Mute state loaded:", isMuted);
    }
    function handleMuteChange() { /* Sin cambios */
        isMuted = muteCheckbox.checked; localStorage.setItem('isMuted', isMuted); console.log("Mute state changed to:", isMuted);
    }

    // --- Reloj ---
    function updateClock() { /* Sin cambios */
        const now = new Date(); clockElement.textContent = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // --- Carga de Turnos y Tareas ---
    function loadShift(shiftName) { /* Sin cambios */
        console.log(`Loading shift: ${shiftName}`); currentShift = shiftName;
        if (typeof scheduleData !== 'undefined' && scheduleData[shiftName]) { tasks = scheduleData[shiftName]; } else { console.error(`Data for shift '${shiftName}' not found.`); tasks = []; }
        scheduleTitle.textContent = `Turno ${shiftName === 'morning' ? 'Mañana' : 'Tarde'}`;
        localStorage.setItem('lastShift', shiftName); remindedTasks.clear(); renderTaskList(); stopCurrentTimer(); startReferenceReminders();
    }

    // --- Renderizado de Tareas ---
    function renderTaskList() { // **MODIFICADO para crear contenedor task-actions**
        taskListUl.innerHTML = '';
        if (tasks.length === 0) { taskListUl.innerHTML = '<li>No hay tareas definidas.</li>'; stopReferenceReminders(); return; }
        const completedTasks = getCompletedTasks();

        tasks.forEach(task => {
             if (!task || typeof task !== 'object') { console.error("Invalid task item:", task); return; }
             if (!task.id || !task.name) { task.id = task.id || `task-${Math.random().toString(36).substr(2, 9)}`; task.name = task.name || "Tarea sin nombre"; console.warn("Task corrected:", task); }

            const li = document.createElement('li');
            li.id = task.id;
            const isCompleted = completedTasks.has(task.id);
            li.className = isCompleted ? 'completed' : '';
            const displayDurationMinutes = getTaskDurationMinutes(task);

            // Crear checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isCompleted;
            checkbox.dataset.taskId = task.id;
            checkbox.title = "Marcar como completada";
            checkbox.addEventListener('change', (e) => {
                 toggleTaskCompletion(task.id, e.target.checked);
            });

            // Crear info div
            const infoDiv = document.createElement('div');
            infoDiv.className = 'task-info';
            infoDiv.innerHTML = `
                 <span class="task-name">${task.name}</span>
                 <div class="task-details">Ref: ${task.time || '--:--'} / Dur: ${displayDurationMinutes} min</div>
            `;

            // Crear contenedor de acciones
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'task-actions';

            // Crear botón
            const timerButton = document.createElement('button');
            timerButton.dataset.taskId = task.id;
            timerButton.title = "Iniciar temporizador";
            timerButton.textContent = 'Iniciar Timer';
            timerButton.className = 'start-timer-btn';
            timerButton.onclick = () => startTimer(task.id, timerButton); // Pasar botón

            // Crear mini-timer span
            const miniTimerSpan = document.createElement('span');
            miniTimerSpan.className = 'mini-timer-display';
            miniTimerSpan.style.display = 'none';

            // Añadir botón y span al contenedor de acciones
            actionsDiv.appendChild(timerButton);
            actionsDiv.appendChild(miniTimerSpan);

            // Añadir checkbox, info y acciones al LI
            li.appendChild(checkbox);
            li.appendChild(infoDiv);
            li.appendChild(actionsDiv);

            taskListUl.appendChild(li);
        });
        checkReferenceTimes();
    }


    function getTaskDurationMinutes(task) { /* Sin cambios */
         if (typeof ADJUSTED_TIMES !== 'undefined' && ADJUSTED_TIMES[task.name] !== undefined) { return ADJUSTED_TIMES[task.name] / 60; } return task.duration || 0;
    }
    function getTimerDurationSeconds(task) { /* Sin cambios */
         if (typeof ADJUSTED_TIMES !== 'undefined' && ADJUSTED_TIMES[task.name] !== undefined) { return ADJUSTED_TIMES[task.name]; } return (task.duration || 0) * 60;
    }
    function toggleTaskCompletion(taskId, isCompleted) { /* Sin cambios */
        const li = document.getElementById(taskId); if (!li) return; const completedTasks = getCompletedTasks(); if (isCompleted) { li.classList.add('completed'); completedTasks.add(taskId); } else { li.classList.remove('completed'); completedTasks.delete(taskId); } saveCompletedTasks(completedTasks);
    }
    function getCompletedTasks() { /* Sin cambios */
        const completed = localStorage.getItem(`completedTasks_${currentShift}`); if (completed) { try { return new Set(JSON.parse(completed)); } catch (e) { console.error("Error parsing completed tasks:", e); } } return new Set();
    }
    function saveCompletedTasks(completedSet) { /* Sin cambios */
        if (currentShift) { try { localStorage.setItem(`completedTasks_${currentShift}`, JSON.stringify(Array.from(completedSet))); } catch (e) { console.error("Error saving completed tasks:", e); } }
    }

    // --- Lógica del Timer (MODIFICADO para vibración) ---
    function startTimer(taskId, buttonElement) { // MODIFICADO para vibración
        if (activeTimerInterval) { stopCurrentTimer(); }
        const task = tasks.find(t => t.id === taskId);
        if (!task) { console.error("Task not found:", taskId); return; }
        const durationSeconds = getTimerDurationSeconds(task);
        if (durationSeconds <= 0) { alert(`La tarea "${task.name}" no tiene duración.`); return; }

        activeTaskId = taskId; activeButtonElement = buttonElement; remainingSeconds = durationSeconds;
        timerTaskName.textContent = task.name; updateTimerDisplay();

        activeButtonElement.textContent = 'Detener'; activeButtonElement.classList.remove('start-timer-btn'); activeButtonElement.classList.add('stop-active-timer-btn');
        activeButtonElement.onclick = () => stopCurrentTimer();

        document.querySelectorAll('.start-timer-btn').forEach(btn => { if (btn !== activeButtonElement) { btn.disabled = true; } });

        document.querySelectorAll('#task-list li').forEach(li => { li.classList.remove('active-timer'); li.classList.remove('current-reference-time'); });
        const activeLi = document.getElementById(taskId); if (activeLi) { activeLi.classList.add('active-timer'); }

        // **CAMBIO:** Añadir vibración al iniciar (si no está silenciado)
        vibrateDevice(100); // Patrón simple: 100ms

        activeTimerInterval = setInterval(() => {
            remainingSeconds--; updateTimerDisplay(); if (remainingSeconds < 0) { timerFinished(task); }
        }, 1000);
        console.log(`Timer started for: ${task.name}`);
    }

    function stopCurrentTimer() { // MODIFICADO para vibración (opcional al detener)
        if (!activeTimerInterval && !activeTaskId) return;
        if (activeTimerInterval) { clearInterval(activeTimerInterval); activeTimerInterval = null; }
        const previouslyActiveTaskId = activeTaskId; const previouslyActiveButton = activeButtonElement;
        activeTaskId = null; remainingSeconds = 0; activeButtonElement = null;
        timerTaskName.textContent = 'Ninguna'; timerDisplay.textContent = '--:--';

        if (previouslyActiveTaskId) {
            const activeLi = document.getElementById(previouslyActiveTaskId);
            if (activeLi) {
                activeLi.classList.remove('active-timer');
                const miniTimer = activeLi.querySelector('.mini-timer-display');
                if (miniTimer) { miniTimer.style.display = 'none'; }
            }
            if (previouslyActiveButton) {
                 previouslyActiveButton.textContent = 'Iniciar Timer'; previouslyActiveButton.classList.remove('stop-active-timer-btn'); previouslyActiveButton.classList.add('start-timer-btn');
                 previouslyActiveButton.onclick = () => startTimer(previouslyActiveTaskId, previouslyActiveButton);
            }
        }
        document.querySelectorAll('button.start-timer-btn, button.stop-active-timer-btn').forEach(btn => { if(btn.classList.contains('start-timer-btn')) { btn.disabled = false; } });
        checkReferenceTimes();
        // Opcional: Vibrar al detener manualmente? Podría ser molesto. Lo omitimos por ahora.
        // vibrateDevice(50);
        console.log("Timer stopped.");
    }

    function updateTimerDisplay() { /* MODIFICADO para actualizar mini-timer */
        const minutes = Math.max(0, Math.floor(remainingSeconds / 60));
        const seconds = Math.max(0, remainingSeconds % 60);
        const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        timerDisplay.textContent = formattedTime; // Global

        if (activeTaskId) { // Actualizar mini-timer
            const activeLi = document.getElementById(activeTaskId);
            if (activeLi) {
                const miniTimer = activeLi.querySelector('.mini-timer-display');
                if (miniTimer) { miniTimer.textContent = formattedTime; miniTimer.style.display = 'inline-block'; }
            }
        }
    }

    function timerFinished(task) { // MODIFICADO para vibración
        const taskName = task ? task.name : "Tarea desconocida";
        // **CAMBIO:** Añadir vibración al finalizar (si no está silenciado)
        vibrateDevice([200, 100, 200]); // Patrón: vibra, pausa, vibra
        playTimerEndSound(); // Sonido ANTES de alert
        stopCurrentTimer();
        const message = `¡Tiempo completado para: ${taskName}!`;
        alert(message);
        setTimeout(() => { showNotification("Timer Finalizado", message); }, NOTIFICATION_DELAY);
        console.log(message);
    }

    // --- Sonidos ---
    function playTimerEndSound() { /* Sin cambios */
        if (!isMuted && timerEndSound) { timerEndSound.play().catch(e => console.error("Error playing end sound:", e)); } else if (isMuted) { console.log("End sound MUTED"); }
    }
    function playRefReminderSound() { /* Sin cambios */
        if (!isMuted && refReminderSound) { refReminderSound.play().catch(e => console.error("Error playing reminder sound:", e)); } else if (isMuted) { console.log("Reminder sound MUTED"); }
    }

    // --- NUEVA: Función de Vibración ---
    function vibrateDevice(pattern) {
        if (!isMuted && 'vibrate' in navigator) {
            try {
                 navigator.vibrate(pattern);
                 console.log("Vibrando con patrón:", pattern);
            } catch (e) {
                console.error("Error al intentar vibrar:", e);
            }
        } else if (isMuted) {
             console.log("Vibración SILENCIADA");
        }
        // Si 'vibrate' no está en navigator, simplemente no hará nada.
    }

    // --- Lógica de Recordatorios de Referencia (MODIFICADO para vibración) ---
    function startReferenceReminders() { /* Sin cambios */
        stopReferenceReminders(); console.log("Starting reference reminders check..."); referenceReminderInterval = setInterval(checkReferenceTimes, 60 * 1000); checkReferenceTimes();
    }
    function stopReferenceReminders() { /* Sin cambios */
         if (referenceReminderInterval) { clearInterval(referenceReminderInterval); referenceReminderInterval = null; console.log("Stopping reference reminders check.");}
    }

    function checkReferenceTimes() { // MODIFICADO para marcador persistente
        if (!currentShift || !tasks || tasks.length === 0) return;
        const now = new Date(); const currentTime = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        document.querySelectorAll('#task-list li.current-reference-time').forEach(li => li.classList.remove('current-reference-time'));
        tasks.forEach(task => {
            if (!task || !task.time || !task.id) return;
            if (task.time === currentTime) {
                 if(activeTaskId !== task.id) { // No poner marcador si timer está activo para esta tarea
                    const liElement = document.getElementById(task.id);
                    if (liElement) { liElement.classList.add('current-reference-time'); }
                 }
                 if (!remindedTasks.has(task.id)) {
                    showReferenceReminder(task); remindedTasks.add(task.id); setTimeout(() => remindedTasks.delete(task.id), 61 * 1000);
                }
            }
        });
    }

    function showReferenceReminder(task) { // MODIFICADO para vibración
        if (!task) return;
        console.log(`Reference reminder: ${task.time} - ${task.name}`);
        playRefReminderSound(); // Sonido (respeta mute)
        vibrateDevice(50); // Vibración corta para recordatorio (respeta mute)
        setTimeout(() => { showNotification("Recordatorio SMAPD", `Referencia: ${task.time} - ${task.name}`); }, NOTIFICATION_DELAY); // Notificación (no respeta mute)
    }

    // --- Notificaciones del Sistema ---
    function setupNotificationButton() { /* Sin cambios */
        if (!('Notification' in window)) { console.log("Notifications not supported."); notificationPermissionBtn.style.display = 'none'; return; } if (Notification.permission === 'default') { notificationPermissionBtn.style.display = 'inline-block'; notificationPermissionBtn.onclick = () => { Notification.requestPermission().then(permission => { console.log("Permission:", permission); if (permission === 'granted') { notificationPermissionBtn.style.display = 'none'; showNotification("Permiso Concedido", "Recibirás recordatorios y alertas."); } else { notificationPermissionBtn.textContent = 'Notificaciones Bloqueadas'; notificationPermissionBtn.disabled = true; } }).catch(err => console.error("Error requesting permission:", err)); }; } else if (Notification.permission === 'denied') { notificationPermissionBtn.style.display = 'inline-block'; notificationPermissionBtn.textContent = 'Notificaciones Bloqueadas'; notificationPermissionBtn.disabled = true; } else { notificationPermissionBtn.style.display = 'none'; }
    }
    function showNotification(title, body) { /* Sin cambios */
        if (!('Notification' in window) || Notification.permission !== 'granted') { return; } navigator.serviceWorker.getRegistration().then(registration => { if (registration) { registration.showNotification(title, { body: body, icon: 'images/icon-192x192.png' }).catch(err => console.error("Error SW showNotification:", err)); } else { console.warn("SW not registered, fallback notification may fail."); try { new Notification(title, { body: body, icon: 'images/icon-192x192.png' }); } catch (err) { console.error("Error direct Notification:", err); } } }).catch(err => console.error("Error getRegistration SW:", err));
    }

    // --- Service Worker (PWA) ---
    if ('serviceWorker' in navigator) { /* Sin cambios */
        navigator.serviceWorker.register('sw.js').then(reg => console.log('SW registered. Scope:', reg.scope)).catch(err => console.log('SW registration error:', err));
    } else { console.log("Service workers not supported."); }

    // --- Iniciar la aplicación ---
    init();
});