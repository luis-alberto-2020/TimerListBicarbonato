// Contenido JS completo - Referencia a 'sw.js' corregida
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
            // Opcional: Cargar un turno por defecto
             // loadShift('morning');
        }

        setupNotificationButton();
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
        // Asegurarse que scheduleData esté cargado y tenga la propiedad
        if (typeof scheduleData !== 'undefined' && scheduleData[shiftName]) {
            tasks = scheduleData[shiftName];
        } else {
            console.error(`Datos para el turno '${shiftName}' no encontrados en schedule-data.js`);
            tasks = []; // Usar array vacío si no hay datos
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
            stopReferenceReminders(); // Detener si no hay tareas
            return;
        }
        const completedTasks = getCompletedTasks();

        tasks.forEach(task => {
            // Sanity check for task object
            if (!task || typeof task !== 'object') {
                console.error("Elemento inválido en lista de tareas:", task);
                return; 
            }
            // Asegurar que la tarea tenga al menos un id y nombre
             if (!task.id || !task.name) {
                 console.error("Tarea sin ID o Nombre:", task);
                 // Asignar uno temporal si falta ID para evitar errores, aunque lo ideal es que venga en los datos
                 task.id = task.id || `task-${Math.random().toString(36).substr(2, 9)}`;
                 task.name = task.name || "Tarea sin nombre";
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
    }

    function getTaskDurationMinutes(task) {
        // Usa el objeto ADJUSTED_TIMES global
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
        // Asegurarse de parsear solo si no es null o undefined
        if (completed) {
            try {
                 return new Set(JSON.parse(completed));
            } catch (e) {
                 console.error("Error al parsear tareas completadas:", e);
                 return new Set(); // Devuelve Set vacío en caso de error
            }
        }
        return new Set();
    }

    function saveCompletedTasks(completedSet) {
        if (currentShift) {
            try {
                 localStorage.setItem(`completedTasks_${currentShift}`, JSON.stringify(Array.from(completedSet)));
            } catch (e) {
                 console.error("Error al guardar tareas completadas:", e);
            }
        }
    }

    function startTimer(taskId) {
        if (activeTimerInterval) {
            stopCurrentTimer(); 
        }

        const task = tasks.find(t => t.id === taskId);
        if (!task) {
             console.error("No se encontró la tarea con ID:", taskId);
             return;
        }

        activeTaskId = taskId;
        const durationSeconds = getTimerDurationSeconds(task);

        if (durationSeconds <= 0) {
            console.warn(`Tarea "${task.name}" sin duración válida para iniciar timer.`);
            alert(`La tarea "${task.name}" no tiene una duración definida para iniciar el timer.`);
            activeTaskId = null; // Resetear si no se pudo iniciar
            return; 
        }

        remainingSeconds = durationSeconds;
        timerTaskName.textContent = task.name;
        updateTimerDisplay();

        document.querySelectorAll('.start-timer-btn').forEach(btn => btn.disabled = true);
        stopTimerBtn.style.display = 'inline-block';

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
            if (remainingSeconds < 0) { 
                timerFinished(task);
            }
        }, 1000);

         console.log(`Timer iniciado para: ${task.name}`);
    }

    function stopCurrentTimer() {
        if (activeTimerInterval) {
            clearInterval(activeTimerInterval);
            activeTimerInterval = null;
        }
        const previouslyActiveTaskId = activeTaskId; 
        activeTaskId = null;
        remainingSeconds = 0;
        timerTaskName.textContent = 'Ninguna';
        timerDisplay.textContent = '--:--';

        document.querySelectorAll('.start-timer-btn').forEach(btn => btn.disabled = false);
        stopTimerBtn.style.display = 'none';

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
        const taskName = task ? task.name : "Tarea desconocida"; 
        stopCurrentTimer(); 

        const message = `¡Tiempo completado para: ${taskName}!`;
        alert(message); 
        playTimerEndSound(); 

        showNotification("Timer Finalizado", message);
        console.log(message);
    }

    function playTimerEndSound() {
        if (timerEndSound) {
            timerEndSound.play().catch(e => console.error("Error al reproducir sonido:", e));
        }
    }

    function startReferenceReminders() {
        stopReferenceReminders(); // Detener cualquier intervalo anterior
        console.log("Iniciando chequeo de recordatorios de referencia...");
        referenceReminderInterval = setInterval(checkReferenceTimes, 60 * 1000); // Chequea cada 60 segundos
        checkReferenceTimes(); 
    }

    function stopReferenceReminders() {
         if (referenceReminderInterval) {
            clearInterval(referenceReminderInterval);
            referenceReminderInterval = null;
             console.log("Deteniendo chequeo de recordatorios de referencia.");
        }
    }

    function checkReferenceTimes() {
        if (!currentShift || !tasks || tasks.length === 0) {
             // console.log("Chequeo de recordatorios omitido: sin turno o tareas."); // Debug
             return;
        }

        const now = new Date();
        const currentTime = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }); 

        tasks.forEach(task => {
            if (!task || !task.time || !task.id) return; 

            if (task.time === currentTime) {
                if (!remindedTasks.has(task.id)) {
                    showReferenceReminder(task);
                    remindedTasks.add(task.id); 
                     // Limpiar flag después de un tiempo para evitar repeticiones en el mismo minuto
                     setTimeout(() => remindedTasks.delete(task.id), 61 * 1000); 
                } 
            }
        });
    }

    function showReferenceReminder(task) {
        if (!task) return;
        console.log(`Recordatorio de referencia: ${task.time} - ${task.name}`);

        const liElement = document.getElementById(task.id);
        if (liElement) {
            liElement.classList.add('reminder-highlight');
            setTimeout(() => {
                if (liElement) { 
                     liElement.classList.remove('reminder-highlight');
                }
            }, 3500); 
        } else {
             console.warn("Elemento LI no encontrado para recordatorio:", task.id);
        }

        showNotification("Recordatorio SMAPD", `Referencia: ${task.time} - ${task.name}`);
    }

    function setupNotificationButton() {
        if (!('Notification' in window)) {
            console.log("Navegador no soporta notificaciones.");
            notificationPermissionBtn.style.display = 'none'; 
            return;
        }

        if (Notification.permission === 'default') {
            notificationPermissionBtn.style.display = 'inline-block';
            notificationPermissionBtn.onclick = () => {
                Notification.requestPermission().then(permission => {
                    console.log("Resultado permiso:", permission);
                    if (permission === 'granted') {
                        notificationPermissionBtn.style.display = 'none';
                        showNotification("Permiso Concedido", "Ahora recibirás recordatorios y alertas.");
                    } else {
                        notificationPermissionBtn.textContent = 'Notificaciones Bloqueadas';
                        notificationPermissionBtn.disabled = true;
                    }
                }).catch(err => console.error("Error al solicitar permiso:", err));
            };
        } else if (Notification.permission === 'denied') {
             notificationPermissionBtn.style.display = 'inline-block';
             notificationPermissionBtn.textContent = 'Notificaciones Bloqueadas';
             notificationPermissionBtn.disabled = true;
        } else {
             notificationPermissionBtn.style.display = 'none';
        }
    }

    function showNotification(title, body) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            // console.log("Permiso de notificación no concedido o navegador no soporta."); // Debug
            return; 
        }

        navigator.serviceWorker.getRegistration().then(registration => {
            if (registration) {
                 registration.showNotification(title, {
                    body: body,
                    icon: 'images/icon-192x192.png' 
                 }).catch(err => console.error("Error al mostrar notificación vía SW:", err));
            } else {
                 console.warn("Service worker no registrado, intentando notificación directa (puede fallar).");
                 try {
                    new Notification(title, { body: body, icon: 'images/icon-192x192.png' });
                 } catch (err) {
                     console.error("Error al mostrar notificación directamente:", err);
                 }
            }
        }).catch(err => console.error("Error al obtener registro de SW:", err));
    }

    // --- Service Worker (PWA) ---
    if ('serviceWorker' in navigator) {
        // Registra usando el nombre de archivo correcto 'sw.js'
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                if (registration.installing) {
                    console.log('Service worker instalando');
                } else if (registration.waiting) {
                    console.log('Service worker instalado');
                } else if (registration.active) {
                    console.log('Service worker activo');
                }
                console.log('Service Worker registrado con éxito. Scope:', registration.scope);
            })
            .catch(error => console.log('Error al registrar el Service Worker:', error));
    } else {
        console.log("Service workers no soportados en este navegador.");
    }

    // --- Iniciar la aplicación ---
    init();
});