// Datos del cronograma con ajustes (Mezcla 25min, Desinfección 30min)
// Tiempos de inicio/fin recalculados para coherencia interna
const scheduleData = {
    morning: [
        // Turno Mañana - Tareas Principales (Simplificado para visualización)
        // Nota: Los tiempos exactos pueden variar en la práctica real
        { name: "Llenado Mixer Agua", start: "05:00", duration: 20, timed: false, operator: 1 },
        { name: "Carga Bicarbonato", start: "05:20", duration: 10, timed: false, operator: 1 },
        { name: "Mezcla Bicarbonato", start: "05:30", duration: 25, timed: true, timerDuration: 25 * 60, operator: 1 }, // 25 min timer
        { name: "Llenado Bidones", start: "05:55", duration: 25, timed: false, operator: 1 }, // Starts after 25min mix
        { name: "Sala (Op 1)", start: "06:20", duration: 70, timed: false, operator: 1 }, // Ends 07:30
        { name: "Desinfección Mixer", start: "07:30", duration: 30, timed: true, timerDuration: 30 * 60, operator: 1 }, // Protocol 30min
        { name: "Enjuague Mixer", start: "08:00", duration: 20, timed: false, operator: 1 }, // Starts after 30min disinfect
        { name: "Mixer Libre", start: "08:20", duration: 10, timed: false, operator: 'N/A' }, // Break before next cycle
        // --- Cambio de Operario o Inicio Segundo Ciclo ---
        { name: "Llenado Mixer Agua (Ciclo 2)", start: "08:30", duration: 10, timed: false, operator: 2 },
        { name: "Carga Bicarbonato (Ciclo 2)", start: "08:40", duration: 20, timed: false, operator: 2 },
        { name: "Mezcla Bicarbonato (Ciclo 2)", start: "09:00", duration: 25, timed: true, timerDuration: 25 * 60, operator: 2 }, // 25 min timer
        { name: "Llenado Bidones (Ciclo 2)", start: "09:25", duration: 25, timed: false, operator: 2 }, // Assumed 25min fill time
        { name: "Desayuno Operario 2", start: "09:50", duration: 25, timed: false, operator: 2 }, // Ends 10:15
        { name: "Desinfección Mixer (Ciclo 2)", start: "10:15", duration: 30, timed: true, timerDuration: 30 * 60, operator: 2 }, // Protocol 30min
        { name: "Sala (Op 2)", start: "10:45", duration: 105, timed: false, operator: 2 }, // Ends 12:30
        { name: "Enjuague Mixer (Ciclo 2)", start: "12:30", duration: 20, timed: false, operator: 2 },
        { name: "Mixer Libre Fin Turno Mañana", start: "12:50", duration: 0, timed: false, operator: 'N/A' }, // Placeholder end
        // --- Tareas de Reuso (Paralelas) ---
        { name: "[REUSO] Cloreado Bidones (3er T)", start: "09:00", duration: 30, timed: false, operator: 'Reuso' },
        { name: "[REUSO] Enjuague Bidones (3er T)", start: "09:30", duration: 30, timed: false, operator: 'Reuso' },
    ],
    afternoon: [
         // Turno Tarde - Tareas Principales
        { name: "Llenado Mixer Agua", start: "14:10", duration: 20, timed: false, operator: 1 },
        { name: "Carga Bicarbonato", start: "14:30", duration: 10, timed: false, operator: 1 },
        { name: "Mezcla Bicarbonato", start: "14:40", duration: 25, timed: true, timerDuration: 25 * 60, operator: 1 }, // 25 min timer
        { name: "Llenado Bidones", start: "15:05", duration: 25, timed: false, operator: 1 }, // Starts after 25min mix
        { name: "Sala (Operario)", start: "15:30", duration: 120, timed: false, operator: 1 }, // Ends 17:30
        { name: "Desinfección Mixer", start: "17:30", duration: 30, timed: true, timerDuration: 30 * 60, operator: 1 }, // Protocol 30min
        { name: "Enjuague Mixer", start: "18:00", duration: 20, timed: false, operator: 1 }, // Starts after 30min disinfect
        { name: "Mixer Libre Fin Turno Tarde", start: "18:20", duration: 0, timed: false, operator: 'N/A' },
        // --- Tareas de Reuso (Paralelas) ---
        { name: "[REUSO] Cloreado Bidones (2do T)", start: "18:00", duration: 30, timed: false, operator: 'Reuso' },
        { name: "[REUSO] Enjuague Bidones (2do T)", start: "18:30", duration: 30, timed: false, operator: 'Reuso' },
    ]
};

// Es crucial revisar y validar que esta lista de tareas, sus horarios y duraciones
// reflejen lo más fielmente posible el flujo de trabajo deseado para la guía.