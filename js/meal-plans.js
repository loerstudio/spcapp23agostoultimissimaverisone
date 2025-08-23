import supabase from './supabase-client.js';

const mealPlanListContainer = document.getElementById('meal-plan-list');

// Function to fetch and display meal plans
const fetchAndDisplayMealPlans = async () => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
            window.location.href = 'signin.html';
            return;
        }
        const trainerId = user.id;

        // Fetch meal plans and related client's full_name
        const { data: mealPlans, error } = await supabase
            .from('meal_plans')
            .select(`
                id,
                name,
                description,
                client_id,
                profiles ( full_name )
            `)
            .eq('trainer_id', trainerId);

        if (error) throw error;

        displayMealPlans(mealPlans);

    } catch (error) {
        console.error('Error fetching meal plans:', error);
        mealPlanListContainer.innerHTML = `<p class="text-red-500">Error loading meal plans: ${error.message}</p>`;
    }
};

// Function to display meal plans in the UI
const displayMealPlans = (mealPlans) => {
    mealPlanListContainer.innerHTML = ''; // Clear current list

    if (!mealPlans || mealPlans.length === 0) {
        mealPlanListContainer.innerHTML = '<p>You have not created any meal plans yet.</p>';
        return;
    }

    mealPlans.forEach(plan => {
        const planCard = document.createElement('div');
        planCard.className = 'bg-white p-6 rounded-lg shadow-md';

        const clientName = plan.profiles ? plan.profiles.full_name : 'Not assigned';

        planCard.innerHTML = `
            <h3 class="text-xl font-bold mb-2">${plan.name}</h3>
            <p class="text-gray-600 mb-2">Assigned to: ${clientName}</p>
            <p class="text-gray-700 mb-4">${plan.description || ''}</p>
            <div class="flex justify-end space-x-2">
                <a href="edit-meal-plan.html?id=${plan.id}" class="edit-plan-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">Edit</a>
                <button data-plan-id="${plan.id}" class="delete-plan-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">Delete</button>
            </div>
        `;
        mealPlanListContainer.appendChild(planCard);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-plan-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const planId = e.target.getAttribute('data-plan-id');
            if (confirm('Are you sure you want to delete this meal plan? This action cannot be undone.')) {
                await deleteMealPlan(planId);
            }
        });
    });
};

// Function to delete a meal plan
const deleteMealPlan = async (planId) => {
    try {
        const { error } = await supabase
            .from('meal_plans')
            .delete()
            .eq('id', planId);

        if (error) throw error;

        fetchAndDisplayMealPlans(); // Refresh the list

    } catch (error) {
        console.error('Error deleting meal plan:', error);
        alert(`Failed to delete meal plan: ${error.message}`);
    }
};

// Initial fetch of meal plans when the page loads
document.addEventListener('DOMContentLoaded', fetchAndDisplayMealPlans);
