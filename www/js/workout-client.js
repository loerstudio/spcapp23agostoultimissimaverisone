import supabase from './supabase-client.js';

// DOM Elements
const programNameEl = document.getElementById('program-name');
const programDescriptionEl = document.getElementById('program-description');
const daysAccordion = document.getElementById('days-accordion');

let currentClientId = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = 'signin.html';
        return;
    }
    currentClientId = user.id;
    await fetchFullProgram(currentClientId);
});


async function fetchFullProgram(clientId) {
    try {
        // 1. Fetch assigned program
        const { data: program, error: programError } = await supabase
            .from('workout_programs')
            .select('*')
            .eq('client_id', clientId)
            .limit(1)
            .single();

        if (programError) {
            if (programError.code === 'PGRST116') {
                programNameEl.textContent = 'Nessun Programma Assegnato';
                programDescriptionEl.textContent = 'Il tuo allenatore non ti ha ancora assegnato un programma di allenamento.';
            } else {
                throw programError;
            }
            return;
        }

        // 2. Fetch program days
        const { data: days, error: daysError } = await supabase
            .from('workout_program_days')
            .select('*')
            .eq('program_id', program.id)
            .order('id');
        if (daysError) throw daysError;

        // 3. Fetch exercises for all days
        const dayIds = days.map(d => d.id);
        const { data: dayExercises, error: exercisesError } = await supabase
            .from('workout_day_exercises')
            .select(`
                *,
                exercises ( name, description, photo_url, video_url )
            `)
            .in('workout_day_id', dayIds);
        if (exercisesError) throw exercisesError;

        displayProgram(program, days, dayExercises);

    } catch (error) {
        console.error('Errore caricamento programma di allenamento:', error);
        programNameEl.textContent = 'Errore';
        programDescriptionEl.textContent = 'Impossibile caricare il tuo programma di allenamento.';
    }
}

function displayProgram(program, days, dayExercises) {
    programNameEl.textContent = program.name;
    programDescriptionEl.textContent = program.description;
    daysAccordion.innerHTML = '';

    if (days.length === 0) {
        daysAccordion.innerHTML = '<p>Questo programma non ha ancora giorni di allenamento definiti.</p>';
        return;
    }

    days.forEach(day => {
        const dayWrapper = document.createElement('div');
        dayWrapper.className = 'bg-white rounded-lg shadow-md';

        const exercisesForDay = dayExercises.filter(de => de.workout_day_id === day.id);

        dayWrapper.innerHTML = `
            <div class="day-header p-4 cursor-pointer flex justify-between items-center">
                <h2 class="text-2xl font-bold">${day.day_name}</h2>
                <svg class="w-6 h-6 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            <div class="day-content p-4 border-t hidden">
                <div class="space-y-4">
                    ${exercisesForDay.map(ex => `
                        <div class="exercise-card p-4 border rounded-lg">
                            <h3 class="text-xl font-semibold">${ex.exercises.name}</h3>
                            <div class="flex flex-col md:flex-row gap-4 mt-2">
                                <img src="${ex.exercises.photo_url || 'https://via.placeholder.com/150'}" alt="${ex.exercises.name}" class="w-full md:w-1/3 h-auto object-cover rounded-md">
                                <div class="flex-grow">
                                    <p class="text-gray-700">${ex.exercises.description}</p>
                                    <div class="mt-2 font-bold">
                                        <span>Serie: ${ex.sets}</span> | <span>Ripetizioni: ${ex.reps}</span>
                                    </div>
                                    ${ex.notes ? `<p class="mt-1 text-sm text-gray-600"><strong>Note:</strong> ${ex.notes}</p>` : ''}
                                    ${ex.exercises.video_url ? `<a href="${ex.exercises.video_url}" target="_blank" class="text-blue-500 hover:underline mt-2 inline-block">Guarda Video</a>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('') || '<p>Nessun esercizio per questo giorno.</p>'}
                </div>
                <a href="liveworkoutclient.html?day_id=${day.id}" class="mt-4 inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                    Inizia Allenamento Live
                </a>
            </div>
        `;
        daysAccordion.appendChild(dayWrapper);
    });

    // Accordion functionality
    daysAccordion.querySelectorAll('.day-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const icon = header.querySelector('svg');
            content.classList.toggle('hidden');
            icon.classList.toggle('rotate-180');
        });
    });
}
