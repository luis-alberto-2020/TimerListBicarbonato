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
    const timerEndSound = document.getElementById('timer-end-sound'); // Opcional

    // --- Estado de la Aplicación ---
    let currentShift = null;
    let tasks = [];
    let activeTimerInterval = null;
    let remainingSeconds = 0;
    let activeTaskId = null;
    let referenceReminderInterval = null;
    let remindedTasks = new Set(); // Para no recordar la misma tarea varias veces seguidas

    // --- Inicialización ---
    function init() {
        updateClock();
        setInterval(updateClock, 1000); // Actualiza el reloj cada segundo

        morningShiftBtn.addEventListener('click', () => loadShift('morning'));
        afternoonShiftBtn.addEventListener('click', () => loadShift('afternoon'));
        stopTimerBtn.addEventListener('click', stopCurrentTimer);

        // Cargar último turno si existe
        const lastShift = localStorage.getItem('lastShift');
        if (lastShift) {
            loadShift(lastShift);
        } else {
            // Opcional: Cargar un turno por defecto si no hay nada guardado
             // loadShift('morning');
        }

        setupNotificationButton();
        // No iniciar recordatorios hasta que se cargue un turno
        // startReferenceReminders();
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
        tasks = scheduleData[shiftName] || [];
        scheduleTitle.textContent = `Turno ${shiftName === 'morning' ? 'Mañana' : 'Tarde'}`;
        localStorage.setItem('lastShift', shiftName);
        remindedTasks.clear(); // Limpia las tareas recordadas al cambiar de turno
        renderTaskList();
        stopCurrentTimer(); // Detiene cualquier timer al cambiar de turno
        startReferenceReminders(); // (Re)inicia el chequeo para el nuevo turno
    }

    function renderTaskList() {
        taskListUl.innerHTML = ''; // Limpiar lista anterior
        if (tasks.length === 0) {
            taskListUl.innerHTML = '<li>No hay tareas definidas para este turno.</li>';
            return;
        }
        const completedTasks = getCompletedTasks();

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.id = task.id;
            const isCompleted = completedTasks.has(task.id);
            li.className = isCompleted ? 'completed' : '';

            // Calcula la duración correcta para mostrar (puede ser la ajustada o la base)
            const displayDurationMinutes = getTaskDurationMinutes(task);

            li.innerHTML = `
                <input type="checkbox" ${isCompleted ? 'checked' : ''} data-task-id="${task.id}" title="Marcar como completada">
                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    <div class="task-details">Ref: ${task.time} / Dur: ${displayDurationMinutes} min</div>
                </div>
                <button class="start-timer-btn" data-task-id="${task.id}" title="Iniciar temporizador para esta tarea">Iniciar Timer</button>
            `;

            // Event listener para el checkbox
            li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
                toggleTaskCompletion(task.id, e.target.checked);
            });

            // Event listener para el botón de timer
            li.querySelector('.start-timer-btn').addEventListener('click', () => {
                startTimer(task.id); // Pasamos solo el ID
            });

            taskListUl.appendChild(li);
        });
    }

    // Obtiene la duración en minutos para mostrar en UI
    function getTaskDurationMinutes(task) {
        // ADJUSTED_TIMES guarda segundos, lo convertimos a minutos para mostrar
        const adjustedSeconds = ADJUSTED_TIMES[task.name];
        if (adjustedSeconds !== undefined) {
            return adjustedSeconds / 60;
        }
        return task.duration || 0; // Usa la duración base del schedule-data
    }

     // Obtiene la duración en segundos para usar en el TIMER
     function getTimerDurationSeconds(task) {
        const adjustedSeconds = ADJUSTED_TIMES[task.name];
        if (adjustedSeconds !== undefined) {
            return adjustedSeconds; // Usa el tiempo ajustado si existe
        }
        return (task.duration || 0) * 60; // Usa la duración base convertida a segundos
    }


    // --- Completado de Tareas (LocalStorage) ---
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
        return completed ? new Set(JSON.parse(completed)) : new Set();
    }

    function saveCompletedTasks(completedSet) {
        if (currentShift) {
            localStorage.setItem(`completedTasks_${currentShift}`, JSON.stringify(Array.from(completedSet)));
        }
    }

    // --- Lógica del Timer ---
    function startTimer(taskId) {
        if (activeTimerInterval) {
            // Opcional: Preguntar si quiere detener el timer actual
            // if (!confirm("Ya hay un timer activo. ¿Deseas detenerlo y empezar uno nuevo?")) {
            //     return;
            // }
            stopCurrentTimer(); // Detiene el timer anterior si existe
        }

        const task = tasks.find(t => t.id === taskId);
        if (!task) {
             console.error("No se encontró la tarea con ID:", taskId);
             return;
        }

        activeTaskId = taskId;
        // Usa la función para obtener segundos para el timer (considera ajustes)
        const durationSeconds = getTimerDurationSeconds(task);

        if (durationSeconds <= 0) {
            console.warn(`Tarea "${task.name}" sin duración válida para iniciar timer.`);
            alert(`La tarea "${task.name}" no tiene una duración definida para iniciar el timer.`);
            return; // No iniciar timer si no hay duración
        }

        remainingSeconds = durationSeconds;
        timerTaskName.textContent = task.name;
        updateTimerDisplay();

        // Deshabilitar todos los botones de iniciar timer y mostrar detener
        document.querySelectorAll('.start-timer-btn').forEach(btn => btn.disabled = true);
        stopTimerBtn.style.display = 'inline-block';

        // Resaltar tarea activa
        document.querySelectorAll('#task-list li').forEach(li => li.classList.remove('active-timer'));
        const activeLi = document.getElementById(taskId);
        if (activeLi) {
            activeLi.classList.add('active-timer');
        } else {
            console.warn("No se encontró el elemento LI para resaltar:", taskId);
        }


        activeTimerInterval = setInterval(() => {
            remainingSeconds--;
            updateTimerDisplay();
            if (remainingSeconds < 0) { // Usar < 0 para asegurar que se detenga incluso si hay saltos
                timerFinished(task);
            }
        }, 1000);

         console.log(`Timer iniciado para: ${task.name}`);
         // Podrías añadir una breve animación o sonido aquí si quieres
    }

    function stopCurrentTimer() {
        if (activeTimerInterval) {
            clearInterval(activeTimerInterval);
            activeTimerInterval = null;
        }
        const previouslyActiveTaskId = activeTaskId; // Guardar ID antes de limpiar
        activeTaskId = null;
        remainingSeconds = 0;
        timerTaskName.textContent = 'Ninguna';
        timerDisplay.textContent = '--:--';

        // Habilitar botones y ocultar detener
        document.querySelectorAll('.start-timer-btn').forEach(btn => btn.disabled = false);
        stopTimerBtn.style.display = 'none';

        // Quitar resaltado de la tarea que estaba activa
         if (previouslyActiveTaskId) {
            const activeLi = document.getElementById(previouslyActiveTaskId);
            if (activeLi) {
                 activeLi.classList.remove('active-timer');
            }
         }
        console.log("Timer detenido.");
    }

    function updateTimerDisplay() {
        const minutes = Math.max(0, Math.floor(remainingSeconds / 60));
        const seconds = Math.max(0, remainingSeconds % 60);
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function timerFinished(task) {
        const taskName = task ? task.name : "Tarea desconocida"; // Manejar caso donde task sea null
        stopCurrentTimer(); // Limpia intervalo, resetea UI

        // Alerta/Notificación de fin
        const message = `¡Tiempo completado para: ${taskName}!`;
        alert(message); // Alerta simple del navegador
        playTimerEndSound(); // Sonido opcional

        // Opcional: Notificación del sistema si hay permiso
        showNotification("Timer Finalizado", message);

        console.log(message);

        // Opcional: Marcar como completada
        // if (task) {
        //     toggleTaskCompletion(task.id, true);
        //     const checkbox = document.querySelector(`#${task.id} input[type="checkbox"]`);
        //     if (checkbox) checkbox.checked = true;
        // }
    }

    function playTimerEndSound() {
        if (timerEndSound) {
            timerEndSound.play().catch(e => console.error("Error al reproducir sonido:", e));
        }
    }

    // --- Lógica de Recordatorios de Referencia ---
    function startReferenceReminders() {
        if (referenceReminderInterval) {
            clearInterval(referenceReminderInterval);
        }
        console.log("Iniciando chequeo de recordatorios de referencia...");
        // Comprobar cada minuto si alguna tarea coincide con la hora de referencia
        referenceReminderInterval = setInterval(checkReferenceTimes, 60 * 1000);
        checkReferenceTimes(); // Comprobar inmediatamente al cargar/cambiar turno
    }

    function checkReferenceTimes() {
        if (!currentShift || tasks.length === 0) return;

        const now = new Date();
        const currentTime = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }); // Formato HH:MM
         // console.log(`Chequeando recordatorios para ${currentTime}`); // Debug

        tasks.forEach(task => {
            if (!task.time) return; // Saltar tareas sin hora de referencia

            // Compara solo HH:MM
            if (task.time === currentTime) {
                // console.log(`Coincidencia de tiempo para ${task.name} a las ${task.time}`); // Debug
                if (!remindedTasks.has(task.id)) {
                    // Evita recordar si un timer ya está activo para esta tarea (opcional, ¿quizás sí recordar?)
                    // if (activeTaskId !== task.id) {
                        showReferenceReminder(task);
                        remindedTasks.add(task.id); // Marcar como recordada en esta pasada
                        // Limpiar el flag después de 61 segundos para permitir recordar el mismo minuto si es necesario (pero no en el mismo ciclo de chequeo)
                         setTimeout(() => remindedTasks.delete(task.id), 61 * 1000);
                    // } else {
                    //     console.log(`Timer ya activo para ${task.name}, no se muestra recordatorio.`); // Debug
                    // }
                } else {
                    // console.log(`${task.name} ya recordada recientemente.`); // Debug
                }
            }
        });
    }

    function showReferenceReminder(task) {
        console.log(`Recordatorio de referencia: ${task.time} - ${task.name}`);

        // 1. Resaltado visual breve
        const liElement = document.getElementById(task.id);
        if (liElement) {
            liElement.classList.add('reminder-highlight');
            // Quitar resaltado después de un tiempo
            setTimeout(() => {
                if (liElement) { // Volver a comprobar si el elemento aún existe
                     liElement.classList.remove('reminder-highlight');
                }
            }, 3500); // Duración del resaltado (ej. 3.5 segundos)
        } else {
             console.warn("Elemento LI no encontrado para recordatorio:", task.id);
        }

        // 2. Notificación del sistema (opcional, requiere permiso)
        showNotification("Recordatorio SMAPD", `Referencia: ${task.time} - ${task.name}`);
    }


    // --- Notificaciones del Sistema ---
    function setupNotificationButton() {
        if (!('Notification' in window)) {
            console.log("Este navegador no soporta notificaciones de escritorio.");
            notificationPermissionBtn.style.display = 'none'; // Ocultar si no hay soporte
            return;
        }

        if (Notification.permission === 'default') {
            notificationPermissionBtn.style.display = 'inline-block';
            notificationPermissionBtn.onclick = () => {
                Notification.requestPermission().then(permission => {
                    console.log("Resultado permiso:", permission);
                    if (permission === 'granted') {
                        console.log("Permiso de notificación concedido.");
                        notificationPermissionBtn.style.display = 'none';
                        showNotification("Permiso Concedido", "Ahora recibirás recordatorios y alertas.");
                    } else {
                        console.log("Permiso de notificación denegado.");
                        notificationPermissionBtn.textContent = 'Notificaciones Bloqueadas';
                        notificationPermissionBtn.disabled = true;
                    }
                });
            };
        } else if (Notification.permission === 'denied') {
             notificationPermissionBtn.style.display = 'inline-block';
             notificationPermissionBtn.textContent = 'Notificaciones Bloqueadas';
             notificationPermissionBtn.disabled = true;
        } else {
            // Permiso ya concedido, ocultar botón
             notificationPermissionBtn.style.display = 'none';
        }
    }

    function showNotification(title, body) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            console.log("Permiso de notificación no concedido.");
            return; // No hay permiso o soporte
        }

        // Uso de Service Worker para mostrar notificación (mejor para PWAs)
        navigator.serviceWorker.getRegistration().then(registration => {
            if (registration) {
                 registration.showNotification(title, {
                    body: body,
                    icon: 'images/icon-192x192.png' // Ajusta la ruta a tu ícono
                    // Puedes añadir más opciones: vibrate, tag, etc.
                 }).catch(err => console.error("Error al mostrar notificación vía SW:", err));
            } else {
                // Fallback si no hay SW registrado (menos común en PWA funcional)
                // Ojo: esto puede no funcionar si la pestaña no está activa
                 try {
                    new Notification(title, { body: body, icon: 'images/icon-192x192.png' });
                 } catch (err) {
                     console.error("Error al mostrar notificación directamente:", err);
                 }
            }
        });
    }

    // --- Service Worker (PWA) ---
    if ('serviceWorker' in navigator) {
        // Registra usando el nombre de archivo correcto 'sw.js'
        navigator.serviceWorker.register('sw.js')
            .then(registration => console.log('Service Worker registrado con éxito:', registration.scope))
            .catch(error => console.log('Error al registrar el Service Worker:', error));
    }

    // --- Iniciar la aplicación ---
    init();
});