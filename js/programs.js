import supabase from './supabase-client.js';

const programListContainer = document.getElementById('program-list');

// Function to fetch and display workout programs
const fetchAndDisplayPrograms = async () => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
            window.location.href = 'signin.html';
            return;
        }
        const trainerId = user.id;

        // Fetch programs and related client's full_name
        const { data: programs, error } = await supabase
            .from('workout_programs')
            .select(`
                id,
                name,
                description,
                client_id,
                profiles ( full_name )
            `)
            .eq('trainer_id', trainerId);

        if (error) throw error;

        displayPrograms(programs);

    } catch (error) {
        console.error('Error fetching programs:', error);
        programListContainer.innerHTML = `<p class="text-red-500">Error loading programs: ${error.message}</p>`;
    }
};

// Function to display programs in the UI
const displayPrograms = (programs) => {
    programListContainer.innerHTML = ''; // Clear current list

    if (!programs || programs.length === 0) {
        programListContainer.innerHTML = '<p>You have not created any programs yet.</p>';
        return;
    }

    programs.forEach(program => {
        const programCard = document.createElement('div');
        programCard.className = 'bg-white p-6 rounded-lg shadow-md';

        const clientName = program.profiles ? program.profiles.full_name : 'Not assigned';

        programCard.innerHTML = `
            <h3 class="text-xl font-bold mb-2">${program.name}</h3>
            <p class="text-gray-600 mb-2">Assigned to: ${clientName}</p>
            <p class="text-gray-700 mb-4">${program.description || ''}</p>
            <div class="flex justify-end space-x-2">
                <a href="edit-program.html?id=${program.id}" class="edit-program-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">Edit</a>
                <button data-program-id="${program.id}" class="delete-program-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">Delete</button>
            </div>
        `;
        programListContainer.appendChild(programCard);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-program-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const programId = e.target.getAttribute('data-program-id');
            if (confirm('Are you sure you want to delete this program? This action cannot be undone.')) {
                await deleteProgram(programId);
            }
        });
    });
};

// Function to delete a program
const deleteProgram = async (programId) => {
    try {
        const { error } = await supabase
            .from('workout_programs')
            .delete()
            .eq('id', programId);

        if (error) throw error;

        fetchAndDisplayPrograms(); // Refresh the list

    } catch (error) {
        console.error('Error deleting program:', error);
        alert(`Failed to delete program: ${error.message}`);
    }
};

// Initial fetch of programs when the page loads
document.addEventListener('DOMContentLoaded', fetchAndDisplayPrograms);
