    // timer-app.js - Final con Log de Eventos, sin Notificaciones de Sistema para eventos,
    // con timer fijo, mini-timer, botón toggle, vibración y mute.
    document.addEventListener('DOMContentLoaded', () => {
        // --- Elementos del DOM ---
        const clockElement = document.getElementById('clock');
        const morningShiftBtn = document.getElementById('morning-shift-btn');
        const afternoonShiftBtn = document.getElementById('afternoon-shift-btn');
        const scheduleTitle = document.getElementById('schedule-title');
        const taskListUl = document.getElementById('task-list');
        const timerTaskName = document.getElementById('timer-task-name');
        const timerDisplay = document.getElementById('timer-display');
        const notificationPermissionBtn = document.getElementById('request-notification-permission');
        const timerEndSound = document.getElementById('timer-end-sound');
        const refReminderSound = document.getElementById('ref-reminder-sound');
        const muteCheckbox = document.getElementById('mute-checkbox');
        const logDisplay = document.getElementById('event-log-display');
        const clearLogBtn = document.getElementById('clear-log-btn');

        // --- Estado de la Aplicación ---
        let currentShift = null;
        let tasks = [];
        let activeTimerInterval = null;
        let remainingSeconds = 0;
        let activeTaskId = null;
        let activeButtonElement = null; // Referencia al botón activo (modo Detener)
        let referenceReminderInterval = null;
        let remindedTasks = new Set();
        let isMuted = false;
        const MAX_LOG_ENTRIES = 30;

        // --- Inicialización ---
        function init() {
            updateClock(); setInterval(updateClock, 1000);
            morningShiftBtn.addEventListener('click', () => loadShift('morning'));
            afternoonShiftBtn.addEventListener('click', () => loadShift('afternoon'));
            muteCheckbox.addEventListener('change', handleMuteChange);
            clearLogBtn.addEventListener('click', clearLog);
            loadMuteState();
            const lastShift = localStorage.getItem('lastShift');
            if (lastShift) { loadShift(lastShift); }
            else { scheduleTitle.textContent = 'Selecciona un turno'; }
            setupNotificationButton();
            addLogMessage("Aplicación iniciada.");
        }

        // --- Log de Eventos ---
        function addLogMessage(message) {
            if (!logDisplay) { console.warn("Log display not found"); return; }
            const now = new Date();
            const timestamp = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const logEntry = document.createElement('p');
            logEntry.style.margin = '2px 0';
            logEntry.innerHTML = `<strong>[${timestamp}]</strong> ${message}`;
            logDisplay.insertBefore(logEntry, logDisplay.firstChild);
            while (logDisplay.childElementCount > MAX_LOG_ENTRIES) { logDisplay.removeChild(logDisplay.lastChild); }
        }
         function clearLog() {
             if(logDisplay) { logDisplay.innerHTML = ''; addLogMessage("Registro limpiado."); }
         }

        // --- Silencio (Mute) ---
        function loadMuteState() { const savedMuteState = localStorage.getItem('isMuted'); isMuted = savedMuteState === 'true'; muteCheckbox.checked = isMuted; console.log("Mute state loaded:", isMuted); }
        function handleMuteChange() { isMuted = muteCheckbox.checked; localStorage.setItem('isMuted', isMuted); console.log("Mute state changed to:", isMuted); addLogMessage(`Sonidos/Vibración ${isMuted ? 'Silenciados' : 'Activados'}.`); }

        // --- Reloj ---
        function updateClock() { const now = new Date(); clockElement.textContent = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

        // --- Carga de Turnos y Tareas ---
        function loadShift(shiftName) {
            console.log(`Loading shift: ${shiftName}`); currentShift = shiftName;
            if (typeof scheduleData !== 'undefined' && scheduleData[shiftName]) { tasks = scheduleData[shiftName]; } else { console.error(`Data for shift '${shiftName}' not found.`); tasks = []; }
            scheduleTitle.textContent = `Turno ${shiftName === 'morning' ? 'Mañana' : 'Tarde'}`;
            localStorage.setItem('lastShift', shiftName); remindedTasks.clear(); renderTaskList(); stopCurrentTimer(); startReferenceReminders(); addLogMessage(`Turno ${shiftName === 'morning' ? 'Mañana' : 'Tarde'} cargado.`);
        }

        // --- Renderizado de Tareas ---
        function renderTaskList() {
            taskListUl.innerHTML = ''; if (tasks.length === 0) { taskListUl.innerHTML = '<li>No hay tareas definidas.</li>'; stopReferenceReminders(); return; }
            const completedTasks = getCompletedTasks();
            tasks.forEach(task => {
                 if (!task || typeof task !== 'object') { console.error("Invalid task item:", task); return; }
                 if (!task.id || !task.name) { task.id = task.id || `task-${Math.random().toString(36).substr(2, 9)}`; task.name = task.name || "Tarea sin nombre"; console.warn("Task corrected:", task); }
                const li = document.createElement('li'); li.id = task.id; const isCompleted = completedTasks.has(task.id); li.className = isCompleted ? 'completed' : '';
                const displayDurationMinutes = getTaskDurationMinutes(task);
                const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = isCompleted; checkbox.dataset.taskId = task.id; checkbox.title = "Marcar como completada";
                checkbox.addEventListener('change', (e) => { toggleTaskCompletion(task.id, e.target.checked); });
                const infoDiv = document.createElement('div'); infoDiv.className = 'task-info';
                infoDiv.innerHTML = `<span class="task-name">${task.name}</span><div class="task-details">Ref: ${task.time || '--:--'} / Dur: ${displayDurationMinutes} min</div>`;
                const actionsDiv = document.createElement('div'); actionsDiv.className = 'task-actions';
                const timerButton = document.createElement('button'); timerButton.dataset.taskId = task.id; timerButton.title = "Iniciar temporizador"; timerButton.textContent = 'Iniciar Timer'; timerButton.className = 'start-timer-btn';
                timerButton.onclick = () => startTimer(task.id, timerButton);
                const miniTimerSpan = document.createElement('span'); miniTimerSpan.className = 'mini-timer-display'; miniTimerSpan.style.display = 'none';
                actionsDiv.appendChild(timerButton); actionsDiv.appendChild(miniTimerSpan);
                li.appendChild(checkbox); li.appendChild(infoDiv); li.appendChild(actionsDiv);
                taskListUl.appendChild(li);
            });
            checkReferenceTimes();
        }

        // --- Duraciones ---
        function getTaskDurationMinutes(task) { if (typeof ADJUSTED_TIMES !== 'undefined' && ADJUSTED_TIMES[task.name] !== undefined) { return ADJUSTED_TIMES[task.name] / 60; } return task.duration || 0; }
        function getTimerDurationSeconds(task) { if (typeof ADJUSTED_TIMES !== 'undefined' && ADJUSTED_TIMES[task.name] !== undefined) { return ADJUSTED_TIMES[task.name]; } return (task.duration || 0) * 60; }

        // --- Completado de Tareas ---
        function toggleTaskCompletion(taskId, isCompleted) { const li = document.getElementById(taskId); if (!li) return; const completedTasks = getCompletedTasks(); if (isCompleted) { li.classList.add('completed'); completedTasks.add(taskId); addLogMessage(`Tarea completada: ${li.querySelector('.task-name')?.textContent || taskId}`); } else { li.classList.remove('completed'); completedTasks.delete(taskId); addLogMessage(`Tarea desmarcada: ${li.querySelector('.task-name')?.textContent || taskId}`); } saveCompletedTasks(completedTasks); }
        function getCompletedTasks() { const completed = localStorage.getItem(`completedTasks_${currentShift}`); if (completed) { try { return new Set(JSON.parse(completed)); } catch (e) { console.error("Error parsing completed tasks:", e); } } return new Set(); }
        function saveCompletedTasks(completedSet) { if (currentShift) { try { localStorage.setItem(`completedTasks_${currentShift}`, JSON.stringify(Array.from(completedSet))); } catch (e) { console.error("Error saving completed tasks:", e); } } }

        // --- Lógica del Timer ---
        function startTimer(taskId, buttonElement) {
            if (activeTimerInterval) { stopCurrentTimer(); }
            const task = tasks.find(t => t.id === taskId); if (!task) { console.error("Task not found:", taskId); return; }
            const durationSeconds = getTimerDurationSeconds(task); if (durationSeconds <= 0) { alert(`La tarea "${task.name}" no tiene duración.`); return; }
            activeTaskId = taskId; activeButtonElement = buttonElement; remainingSeconds = durationSeconds; timerTaskName.textContent = task.name; updateTimerDisplay();
            activeButtonElement.textContent = 'Detener'; activeButtonElement.classList.remove('start-timer-btn'); activeButtonElement.classList.add('stop-active-timer-btn');
            activeButtonElement.onclick = () => stopCurrentTimer();
            document.querySelectorAll('.start-timer-btn').forEach(btn => { if (btn !== activeButtonElement) { btn.disabled = true; } });
            document.querySelectorAll('#task-list li').forEach(li => { li.classList.remove('active-timer'); li.classList.remove('current-reference-time'); });
            const activeLi = document.getElementById(taskId); if (activeLi) { activeLi.classList.add('active-timer'); }
            vibrateDevice(100); addLogMessage(`Timer iniciado: ${task.name}`);
            activeTimerInterval = setInterval(() => { remainingSeconds--; updateTimerDisplay(); if (remainingSeconds < 0) { timerFinished(task); } }, 1000);
            console.log(`Timer started for: ${task.name}`);
        }

        function stopCurrentTimer() {
            if (!activeTimerInterval && !activeTaskId) return; const manualStop = !!activeTimerInterval;
            if (activeTimerInterval) { clearInterval(activeTimerInterval); activeTimerInterval = null; }
            const previouslyActiveTaskId = activeTaskId; const previouslyActiveButton = activeButtonElement;
            activeTaskId = null; remainingSeconds = 0; activeButtonElement = null; timerTaskName.textContent = 'Ninguna'; timerDisplay.textContent = '--:--';
            if (previouslyActiveTaskId) {
                const activeLi = document.getElementById(previouslyActiveTaskId);
                if (activeLi) { activeLi.classList.remove('active-timer'); const miniTimer = activeLi.querySelector('.mini-timer-display'); if (miniTimer) { miniTimer.style.display = 'none'; } }
                if (previouslyActiveButton) { previouslyActiveButton.textContent = 'Iniciar Timer'; previouslyActiveButton.classList.remove('stop-active-timer-btn'); previouslyActiveButton.classList.add('start-timer-btn'); previouslyActiveButton.onclick = () => startTimer(previouslyActiveTaskId, previouslyActiveButton); }
            }
            document.querySelectorAll('button.start-timer-btn, button.stop-active-timer-btn').forEach(btn => { if(btn.classList.contains('start-timer-btn')) { btn.disabled = false; } });
            checkReferenceTimes(); if (manualStop) { addLogMessage('Timer detenido manualmente.'); } console.log("Timer stopped.");
        }

        function updateTimerDisplay() { const minutes = Math.max(0, Math.floor(remainingSeconds / 60)); const seconds = Math.max(0, remainingSeconds % 60); const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; timerDisplay.textContent = formattedTime; if (activeTaskId) { const activeLi = document.getElementById(activeTaskId); if (activeLi) { const miniTimer = activeLi.querySelector('.mini-timer-display'); if (miniTimer) { miniTimer.textContent = formattedTime; miniTimer.style.display = 'inline-block'; } } } }

        function timerFinished(task) {
            const taskName = task ? task.name : "Tarea desconocida";
            vibrateDevice([200, 100, 200]); playTimerEndSound();
            const wasActiveTaskId = activeTaskId; stopCurrentTimer();
            const message = `¡Tiempo completado para: ${taskName}!`;
            alert(message); // Mantenemos alert
            addLogMessage(`Timer finalizado: ${taskName}`); // Añadir a log
            console.log(message);
        }

        // --- Sonidos ---
        function playTimerEndSound() { if (!isMuted && timerEndSound) { timerEndSound.play().catch(e => console.error("Error playing end sound:", e)); } else if (isMuted) { console.log("End sound MUTED"); } }
        function playRefReminderSound() { if (!isMuted && refReminderSound) { refReminderSound.play().catch(e => console.error("Error playing reminder sound:", e)); } else if (isMuted) { console.log("Reminder sound MUTED"); } }

        // --- Vibración ---
        function vibrateDevice(pattern) { if (!isMuted && 'vibrate' in navigator) { try { navigator.vibrate(pattern); console.log("Vibrating:", pattern); } catch (e) { console.error("Error vibrating:", e); } } else if (isMuted) { console.log("Vibration MUTED"); } }

        // --- Lógica de Recordatorios de Referencia ---
        function startReferenceReminders() { stopReferenceReminders(); console.log("Starting reference reminders check..."); referenceReminderInterval = setInterval(checkReferenceTimes, 60 * 1000); checkReferenceTimes(); }
        function stopReferenceReminders() { if (referenceReminderInterval) { clearInterval(referenceReminderInterval); referenceReminderInterval = null; console.log("Stopping reference reminders check.");} }

        function checkReferenceTimes() {
            if (!currentShift || !tasks || tasks.length === 0) return;
            const now = new Date(); const currentTime = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            document.querySelectorAll('#task-list li.current-reference-time').forEach(li => li.classList.remove('current-reference-time'));
            tasks.forEach(task => {
                if (!task || !task.time || !task.id) return;
                if (task.time === currentTime) {
                     if(activeTaskId !== task.id) { const liElement = document.getElementById(task.id); if (liElement) { liElement.classList.add('current-reference-time'); } }
                     if (!remindedTasks.has(task.id)) { showReferenceReminder(task); remindedTasks.add(task.id); setTimeout(() => remindedTasks.delete(task.id), 61 * 1000); }
                }
            });
        }

        function showReferenceReminder(task) { // Quitado showNotification, añadido log
            if (!task) return;
            console.log(`Reference reminder: ${task.time} - ${task.name}`);
            playRefReminderSound(); // Sonido (respeta mute)
            vibrateDevice(50); // Vibración (respeta mute)
            addLogMessage(`Recordatorio ref: ${task.name} (${task.time})`); // Añadir a log
        }

        // --- Notificaciones del Sistema (Solo para permiso inicial) ---
        function setupNotificationButton() { if (!('Notification' in window)) { console.log("Notifications not supported."); notificationPermissionBtn.style.display = 'none'; return; } if (Notification.permission === 'default') { notificationPermissionBtn.style.display = 'inline-block'; notificationPermissionBtn.onclick = () => { Notification.requestPermission().then(permission => { console.log("Permission:", permission); if (permission === 'granted') { notificationPermissionBtn.style.display = 'none'; showNotification("Permiso Concedido", "Notificaciones del sistema activadas."); addLogMessage("Permiso de notificación concedido."); } else { notificationPermissionBtn.textContent = 'Notificaciones Bloqueadas'; notificationPermissionBtn.disabled = true; addLogMessage("Permiso de notificación denegado.");} }).catch(err => {console.error("Error requesting permission:", err); addLogMessage("Error al pedir permiso de notificación.");}); }; } else if (Notification.permission === 'denied') { notificationPermissionBtn.style.display = 'inline-block'; notificationPermissionBtn.textContent = 'Notificaciones Bloqueadas'; notificationPermissionBtn.disabled = true; } else { notificationPermissionBtn.style.display = 'none'; } }
        // Esta función ahora solo se usa realmente al conceder permiso
        function showNotification(title, body) { if (!('Notification' in window) || Notification.permission !== 'granted') { return; } navigator.serviceWorker.getRegistration().then(registration => { if (registration) { registration.showNotification(title, { body: body, icon: 'images/icon-192x192.png' }).catch(err => console.error("Error SW showNotification:", err)); } else { console.warn("SW not registrado, notificación fallback puede fallar."); try { new Notification(title, { body: body, icon: 'images/icon-192x192.png' }); } catch (err) { console.error("Error direct Notification:", err); } } }).catch(err => console.error("Error getRegistration SW:", err)); }

        // --- Service Worker (PWA) ---
        if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').then(reg => console.log('SW registrado. Scope:', reg.scope)).catch(err => console.log('Error registro SW:', err)); } else { console.log("Service workers no soportados."); }

        // --- Iniciar la aplicación ---
        init();
    });