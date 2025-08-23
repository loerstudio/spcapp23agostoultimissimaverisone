import supabase from './supabase-client.js';

// DOM Elements
const welcomeMessageEl = document.getElementById('welcome-message');
const workoutSummaryEl = document.getElementById('workout-summary');
const mealPlanSummaryEl = document.getElementById('meal-plan-summary');
const progressSummaryEl = document.getElementById('progress-summary');

let currentClientId = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = 'signin.html';
        return;
    }
    currentClientId = user.id;

    await loadWelcomeMessage(currentClientId);
    await loadWorkoutSummary(currentClientId);
    await loadMealPlanSummary(currentClientId);
    await loadProgressSummary(currentClientId);
});

async function loadWelcomeMessage(clientId) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', clientId)
            .single();
        if (error) throw error;
        if (profile && profile.full_name) {
            welcomeMessageEl.textContent = `Benvenuto, ${profile.full_name}!`;
        }
    } catch (error) {
        console.error('Errore caricamento profilo:', error);
    }
}

async function loadWorkoutSummary(clientId) {
    try {
        const { data: program, error } = await supabase
            .from('workout_programs')
            .select('name, description')
            .eq('client_id', clientId)
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                workoutSummaryEl.innerHTML = '<p>Nessun programma di allenamento ti è stato ancora assegnato.</p>';
            } else {
                throw error;
            }
            return;
        }

        if (program) {
            workoutSummaryEl.innerHTML = `
                <h3 class="text-xl font-bold">${program.name}</h3>
                <p class="text-gray-700">${program.description}</p>
            `;
        }
    } catch (error) {
        console.error('Errore caricamento riepilogo allenamento:', error);
        workoutSummaryEl.innerHTML = '<p class="text-red-500">Impossibile caricare i dettagli dell\'allenamento.</p>';
    }
}

async function loadMealPlanSummary(clientId) {
    try {
        const { data: plan, error } = await supabase
            .from('meal_plans')
            .select('name, description')
            .eq('client_id', clientId)
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                mealPlanSummaryEl.innerHTML = '<p>Nessun piano alimentare ti è stato ancora assegnato.</p>';
            } else {
                throw error;
            }
            return;
        }

        if (plan) {
            mealPlanSummaryEl.innerHTML = `
                <h3 class="text-xl font-bold">${plan.name}</h3>
                <p class="text-gray-700">${plan.description}</p>
            `;
        }
    } catch (error) {
        console.error('Errore caricamento riepilogo piano alimentare:', error);
        mealPlanSummaryEl.innerHTML = '<p class="text-red-500">Impossibile caricare i dettagli del piano alimentare.</p>';
    }
}

async function loadProgressSummary(clientId) {
    try {
        const { data: goal, error } = await supabase
            .from('goals')
            .select('end_date, description')
            .eq('client_id', clientId)
            .order('start_date', { ascending: false })
            .limit(1)
            .single();

        if (error) {
             if (error.code === 'PGRST116') {
                progressSummaryEl.innerHTML = '<p>Non hai ancora impostato un obiettivo. Vai alla scheda Progressi per iniziare!</p>';
            } else {
                throw error;
            }
            return;
        }

        if (goal) {
            progressSummaryEl.innerHTML = `
                <p>Il tuo obiettivo attuale: <strong>${goal.description}</strong></p>
                <p>Data obiettivo: <strong>${new Date(goal.end_date).toLocaleDateString()}</strong></p>
            `;
        }
    } catch (error) {
        console.error('Errore caricamento riepilogo progressi:', error);
        progressSummaryEl.innerHTML = '<p class="text-red-500">Impossibile caricare i dettagli dei progressi.</p>';
    }
}
