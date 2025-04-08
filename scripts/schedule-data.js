const scheduleData = {
    morning: [
        // Datos extraídos del cronograma Turno Mañana
        { id: 'm1', name: 'Llenado de Mixer con Agua de Osmosis', time: '05:00', duration: 20 },
        { id: 'm2', name: 'Carga de Bicarbonato en polvo', time: '05:20', duration: 10 },
        { id: 'm3', name: 'Recirculado de Preparacion de Bicarbonato', time: '05:30', duration: 20 },
        { id: 'm4', name: 'Llenado de bidones con preparacion hasta 5 litros', time: '05:50', duration: 25 },
        { id: 'm5', name: 'Atender Sala / Pacientes', time: '06:15', duration: 75 }, // Nombre aclarado
        { id: 'm6', name: 'Cloreado de Mixer al 1%', time: '07:30', duration: 20 },
        { id: 'm7', name: 'Doble enjuague de Mixer', time: '07:50', duration: 20 },
        { id: 'm8', name: 'Llenado de Mixer con Agua de Osmosis', time: '08:10', duration: 20 },
        { id: 'm9', name: 'Carga de Bicarbonato en polvo', time: '08:30', duration: 10 },
        { id: 'm10', name: 'Recirculado de Preparacion de Bicarbonato', time: '08:40', duration: 20 },
        { id: 'm11', name: 'DESAYUNO (con detencion de Mixer a las 9:10 hs)', time: '09:00', duration: 40 },
        { id: 'm12', name: 'Cloreado de bidones del 3er turno al 1%', time: '09:00', duration: 30 }, // Tarea Paralela
        { id: 'm13', name: 'Doble enjuague bidones del 3er turno', time: '09:30', duration: 30 }, // Tarea Paralela
        { id: 'm14', name: 'Llenado de bidones con preparacion hasta 5 litros', time: '09:40', duration: 25 },
        { id: 'm15', name: 'Cloreado de Mixer al 1%', time: '10:05', duration: 5 },
        { id: 'm16', name: 'Atender Sala / Pacientes', time: '10:10', duration: 140 }, // Nombre aclarado
        { id: 'm17', name: 'Doble enjuague de Mixer', time: '12:30', duration: 20 }
    ],
    afternoon: [
        // Datos extraídos del cronograma Turno Tarde
        { id: 't1', name: 'Llenado de Mixer con Agua de Osmosis', time: '14:10', duration: 20 },
        { id: 't2', name: 'Carga de Bicarbonato en polvo', time: '14:30', duration: 10 },
        { id: 't3', name: 'Recirculado de Preparacion de Bicarbonato', time: '14:40', duration: 20 },
        { id: 't4', name: 'Llenado de bidones con preparacion hasta 5 litros', time: '15:00', duration: 25 },
        { id: 't5', name: 'Atender Sala / Pacientes', time: '15:25', duration: 125 }, // Nombre aclarado
        { id: 't6', name: 'Cloreado de Mixer al 1%', time: '17:30', duration: 20 },
        { id: 't7', name: 'Doble enjuague de Mixer', time: '17:50', duration: 20 },
        { id: 't8', name: 'Cloreado de bidones del 2do turno al 1%', time: '18:00', duration: 30 },
        { id: 't9', name: 'Doble enjuague bidones del 2do turno', time: '18:30', duration: 30 }
    ]
};

// Tiempos especiales ajustados (en segundos para la lógica del timer)
// Asegúrate que el nombre coincida EXACTAMENTE con el 'name' en los datos de arriba si aplica
const ADJUSTED_TIMES = {
    // Ejemplo si 'Preparación de Bicarbonato / Mezcla' fuera una tarea distinta:
    // 'Preparación de Bicarbonato / Mezcla': 25 * 60,
    'Desinfección Máquinas': 30 * 60 // Ajusta si 'Desinfección Máquinas' existe en tus datos con otro nombre exacto
    // Añade aquí otras tareas si necesitan un tiempo fijo diferente a su duración base
};

// Nota: La tarea "Preparación de Bicarbonato / Mezcla" y "Desinfección Máquinas"
// deben tener EXACTAMENTE ese nombre en las listas de arriba para que
// ADJUSTED_TIMES funcione. Revisa y ajusta si es necesario.
// Si la mezcla es 'Recirculado de Preparacion de Bicarbonato' o similar, usa ese nombre en ADJUSTED_TIMES.
// Basado en los cronogramas, parece que no hay una tarea llamada exactamente "Mezcla Bicarbonato" o "Desinfección Máquinas",
// así que ADJUSTED_TIMES podría no aplicar o necesitar que ajustes los nombres clave.
// Por ahora, se usarán las duraciones calculadas de los cronogramas para todas las tareas.
// Si necesitas forzar 25/30 min para alguna tarea específica, ajusta su nombre exacto en ADJUSTED_TIMES.