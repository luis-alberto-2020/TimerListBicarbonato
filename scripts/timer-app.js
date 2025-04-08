// Contenido JS completo - Con mute, sonido referencia, highlight persistente
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
    const refReminderSound = document.getElementById('ref-reminder-sound'); // Nuevo audio
    const muteCheckbox = document.getElementById('mute-checkbox'); // Checkbox de silencio

    // --- Estado de la Aplicación ---
    let currentShift = null;
    let tasks = [];
    let activeTimerInterval = null;
    let remainingSeconds = 0;
    let activeTaskId = null;
    let referenceReminderInterval = null;
    let remindedTasks = new Set();
    let isMuted = false; // Estado de silencio

    // --- Inicialización ---
    function init() {
        updateClock();
        setInterval(updateClock, 1000);

        morningShiftBtn.addEventListener('click', () => loadShift('morning'));
        afternoonShiftBtn.addEventListener('click', () => loadShift('afternoon'));
        stopTimerBtn.addEventListener('click', stopCurrentTimer);
        muteCheckbox.addEventListener('change', handleMuteChange); // Listener para el checkbox

        // Cargar estado de silencio
        loadMuteState();

        // Cargar último turno si existe
        const lastShift = localStorage.getItem('lastShift');
        if (lastShift) {
            loadShift(lastShift);
        }

        setupNotificationButton();
    }

    // --- Silencio (Mute) ---
    function loadMuteState() {
        const savedMuteState = localStorage.getItem('isMuted');
        isMuted = savedMuteState === 'true'; // Convertir string a boolean
        muteCheckbox.checked = isMuted;
        console.log("Estado de silencio cargado:", isMuted);
    }

    function handleMuteChange() {
        isMuted = muteCheckbox.checked;
        localStorage.setItem('isMuted', isMuted);
        console.log("Estado de silencio cambiado a:", isMuted);
        // Opcional: podrías reproducir un sonido corto al (des)activar si no está muteado
        // if (!isMuted) { playAShortConfirmationSoundMaybe(); }
    }


    // --- Reloj ---
    function updateClock() {
        const now = new Date();
        clockElement.textContent = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // --- Carga de Turnos y Tareas ---
    function loadShift(shiftName) {
        console.log(`Cargando turno: ${shiftName}`);
        currentShift = shiftName;
        if (typeof scheduleData !== 'undefined' && scheduleData[shiftName]) {
            tasks = scheduleData[shiftName];
        } else {
            console.error(`Datos para el turno '${shiftName}' no encontrados.`);
            tasks = [];
        }
        scheduleTitle.textContent = `Turno ${shiftName === 'morning' ? 'Mañana' : 'Tarde'}`;
        localStorage.setItem('lastShift', shiftName);
        remindedTasks.clear();
        renderTaskList();
        stopCurrentTimer();
        startReferenceReminders();
    }

    function renderTaskList() {
        taskListUl.innerHTML = '';
        if (tasks.length === 0) {
            taskListUl.innerHTML = '<li>No hay tareas definidas para este turno.</li>';
            stopReferenceReminders();
            return;
        }
        const completedTasks = getCompletedTasks();

        tasks.forEach(task => {
             if (!task || typeof task !== 'object') { console.error("Elemento inválido:", task); return; }
             if (!task.id || !task.name) {
                 task.id = task.id || `task-${Math.random().toString(36).substr(2, 9)}`;
                 task.name = task.name || "Tarea sin nombre";
                 console.warn("Tarea sin ID o Nombre corregida temporalmente:", task);
             }

            const li = document.createElement('li');
            li.id = task.id;
            const isCompleted = completedTasks.has(task.id);
            li.className = isCompleted ? 'completed' : '';
            const displayDurationMinutes = getTaskDurationMinutes(task);

            li.innerHTML = `
                <input type="checkbox" ${isCompleted ? 'checked' : ''} data-task-id="${task.id}" title="Marcar como completada">
                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    <div class="task-details">Ref: ${task.time || '--:--'} / Dur: ${displayDurationMinutes} min</div>
                </div>
                <button class="start-timer-btn" data-task-id="${task.id}" title="Iniciar temporizador para esta tarea">Iniciar Timer</button>
            `;

            li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
                toggleTaskCompletion(task.id, e.target.checked);
            });
            li.querySelector('.start-timer-btn').addEventListener('click', () => {
                startTimer(task.id);
            });
            taskListUl.appendChild(li);
        });
        // Asegurar que el estado de resaltado de referencia se aplique al renderizar
        checkReferenceTimes(); 
    }

    function getTaskDurationMinutes(task) {
         if (typeof ADJUSTED_TIMES !== 'undefined' && ADJUSTED_TIMES[task.name] !== undefined) {
            return ADJUSTED_TIMES[task.name] / 60;
        }
        return task.duration || 0;
    }

    function getTimerDurationSeconds(task) {
         if (typeof ADJUSTED_TIMES !== 'undefined' && ADJUSTED_TIMES[task.name] !== undefined) {
            return ADJUSTED_TIMES[task.name];
        }
        return (task.duration || 0) * 60;
    }

    function toggleTaskCompletion(taskId, isCompleted) {
        const li = document.getElementById(taskId);
        if (!li) return;
        const completedTasks = getCompletedTasks();
        if (isCompleted) {
            li.classList.add('completed');
            completedTasks.add(taskId);
        } else {
            li.classList.remove('completed');
            completedTasks.delete(taskId);
        }
        saveCompletedTasks(completedTasks);
    }

    function getCompletedTasks() {
        const completed = localStorage.getItem(`completedTasks_${currentShift}`);
        if (completed) { try { return new Set(JSON.parse(completed)); } catch (e) { console.error("Error parseando tareas completadas:", e); } }
        return new Set();
    }

    function saveCompletedTasks(completedSet) {
        if (currentShift) { try { localStorage.setItem(`completedTasks_${currentShift}`, JSON.stringify(Array.from(completedSet))); } catch (e) { console.error("Error guardando tareas completadas:", e); } }
    }

    function startTimer(taskId) {
        if (activeTimerInterval) { stopCurrentTimer(); }
        const task = tasks.find(t => t.id === taskId);
        if (!task) { console.error("Tarea no encontrada:", taskId); return; }

        activeTaskId = taskId;
        const durationSeconds = getTimerDurationSeconds(task);
        if (durationSeconds <= 0) {
            alert(`La tarea "${task.name}" no tiene duración para iniciar timer.`);
            activeTaskId = null; return;
        }

        remainingSeconds = durationSeconds;
        timerTaskName.textContent = task.name;
        updateTimerDisplay();

        document.querySelectorAll('.start-timer-btn').forEach(btn => btn.disabled = true);
        stopTimerBtn.style.display = 'inline-block';

        document.querySelectorAll('#task-list li').forEach(li => {
             li.classList.remove('active-timer');
             li.classList.remove('current-reference-time'); // Quitar marcador de referencia si estaba
        });
        const activeLi = document.getElementById(taskId);
        if (activeLi) { activeLi.classList.add('active-timer'); }

        activeTimerInterval = setInterval(() => {
            remainingSeconds--;
            updateTimerDisplay();
            if (remainingSeconds < 0) { timerFinished(task); }
        }, 1000);
        console.log(`Timer iniciado para: ${task.name}`);
    }

    function stopCurrentTimer() {
        if (activeTimerInterval) { clearInterval(activeTimerInterval); activeTimerInterval = null; }
        const previouslyActiveTaskId = activeTaskId;
        activeTaskId = null; remainingSeconds = 0;
        timerTaskName.textContent = 'Ninguna'; timerDisplay.textContent = '--:--';
        document.querySelectorAll('.start-timer-btn').forEach(btn => btn.disabled = false);
        stopTimerBtn.style.display = 'none';
        if (previouslyActiveTaskId) {
            const activeLi = document.getElementById(previouslyActiveTaskId);
            if (activeLi) { activeLi.classList.remove('active-timer'); }
        }
        // Re-evaluar qué tarea de referencia está activa ahora que no hay timer
        checkReferenceTimes();
        console.log("Timer detenido.");
    }

    function updateTimerDisplay() {
        const minutes = Math.max(0, Math.floor(remainingSeconds / 60));
        const seconds = Math.max(0, remainingSeconds % 60);
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function timerFinished(task) {
        const taskName = task ? task.name : "Tarea desconocida";
        playTimerEndSound(); // Intentar reproducir sonido (verificará mute dentro)
        stopCurrentTimer();
        const message = `¡Tiempo completado para: ${taskName}!`;
        alert(message);
        showNotification("Timer Finalizado", message); // Notificación (no afectada por mute de sonido)
        console.log(message);
    }

    // --- Sonidos (Verifican Mute Internamente) ---
    function playTimerEndSound() {
        if (!isMuted && timerEndSound) {
            timerEndSound.play().catch(e => console.error("Error al reproducir sonido fin de timer:", e));
        }
    }
    function playRefReminderSound() {
        if (!isMuted && refReminderSound) {
            refReminderSound.play().catch(e => console.error("Error al reproducir sonido recordatorio:", e));
        }
    }

    // --- Lógica de Recordatorios de Referencia ---
    function startReferenceReminders() {
        stopReferenceReminders();
        console.log("Iniciando chequeo de recordatorios...");
        referenceReminderInterval = setInterval(checkReferenceTimes, 60 * 1000);
        checkReferenceTimes();
    }
    function stopReferenceReminders() {
         if (referenceReminderInterval) { clearInterval(referenceReminderInterval); referenceReminderInterval = null; console.log("Deteniendo chequeo de recordatorios.");}
    }

    function checkReferenceTimes() {
        if (!currentShift || !tasks || tasks.length === 0) return;
        const now = new Date();
        const currentTime = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

        // Limpiar marcador de referencia anterior
        document.querySelectorAll('#task-list li.current-reference-time').forEach(li => li.classList.remove('current-reference-time'));

        tasks.forEach(task => {
            if (!task || !task.time || !task.id) return;
            if (task.time === currentTime) {
                 // Aplicar marcador visual persistente (si no hay timer activo en esta tarea)
                 if(activeTaskId !== task.id) {
                    const liElement = document.getElementById(task.id);
                    if (liElement) { liElement.classList.add('current-reference-time'); }
                 }
                 // Trigger recordatorio (sonido/notif) solo si no se ha recordado recientemente
                 if (!remindedTasks.has(task.id)) {
                    showReferenceReminder(task); // Llama a sonido y notificación
                    remindedTasks.add(task.id);
                    setTimeout(() => remindedTasks.delete(task.id), 61 * 1000);
                }
            }
        });
    }

    // Ya no maneja highlight visual, solo log, sonido y notif
    function showReferenceReminder(task) {
        if (!task) return;
        console.log(`Recordatorio de referencia: ${task.time} - ${task.name}`);
        playRefReminderSound(); // Intentar reproducir sonido (verifica mute dentro)
        showNotification("Recordatorio SMAPD", `Referencia: ${task.time} - ${task.name}`); // Notificación (no afectada por mute de sonido)
    }

    // --- Notificaciones del Sistema ---
    function setupNotificationButton() {
        if (!('Notification' in window)) { console.log("Navegador no soporta notificaciones."); notificationPermissionBtn.style.display = 'none'; return; }
        if (Notification.permission === 'default') {
            notificationPermissionBtn.style.display = 'inline-block';
            notificationPermissionBtn.onclick = () => {
                Notification.requestPermission().then(permission => {
                    console.log("Permiso Notif:", permission);
                    if (permission === 'granted') { notificationPermissionBtn.style.display = 'none'; showNotification("Permiso Concedido", "Recibirás recordatorios y alertas."); }
                    else { notificationPermissionBtn.textContent = 'Notificaciones Bloqueadas'; notificationPermissionBtn.disabled = true; }
                }).catch(err => console.error("Error solicitando permiso Notif:", err));
            };
        } else if (Notification.permission === 'denied') {
             notificationPermissionBtn.style.display = 'inline-block'; notificationPermissionBtn.textContent = 'Notificaciones Bloqueadas'; notificationPermissionBtn.disabled = true;
        } else { notificationPermissionBtn.style.display = 'none'; }
    }

    function showNotification(title, body) {
        // No chequear isMuted aquí, ya que el usuario pidió que el mute sea solo para sonidos.
        if (!('Notification' in window) || Notification.permission !== 'granted') { return; }
        navigator.serviceWorker.getRegistration().then(registration => {
            if (registration) {
                 registration.showNotification(title, { body: body, icon: 'images/icon-192x192.png' })
                 .catch(err => console.error("Error SW showNotification:", err));
            } else { console.warn("SW no registrado, notificación fallback puede fallar."); try { new Notification(title, { body: body, icon: 'images/icon-192x192.png' }); } catch (err) { console.error("Error Notificación directa:", err); } }
        }).catch(err => console.error("Error getRegistration SW:", err));
    }

    // --- Service Worker (PWA) ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js') // Usa sw.js
            .then(registration => console.log('SW registrado. Scope:', registration.scope))
            .catch(error => console.log('Error registro SW:', error));
    } else { console.log("Service workers no soportados."); }

    // --- Iniciar la aplicación ---
    init();
});