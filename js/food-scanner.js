import supabase from './supabase-client.js';

// DOM Elements
const scannerForm = document.getElementById('food-scanner-form');
const photoInput = document.getElementById('food-photo');
const photoPreview = document.getElementById('photo-preview');
const uploadIcon = document.getElementById('upload-icon');
const uploadText = document.getElementById('upload-text');
const analyzeBtn = document.getElementById('analyze-btn');
const resultsSection = document.getElementById('results-section');
const resultsContent = document.getElementById('results-content');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    photoInput.addEventListener('change', handlePhotoSelection);
    scannerForm.addEventListener('submit', handleFormSubmit);
});


function handlePhotoSelection(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        photoPreview.src = event.target.result;
        photoPreview.classList.remove('hidden');
        uploadIcon.classList.add('hidden');
        uploadText.textContent = 'Change Photo';
        analyzeBtn.classList.remove('hidden');
        resultsSection.classList.add('hidden'); // Hide old results
    };
    reader.readAsDataURL(file);
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const file = photoInput.files[0];
    if (!file) return;

    resultsSection.classList.remove('hidden');
    resultsContent.innerHTML = '<p>Analyzing your photo, please wait...</p>';
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';

    try {
        // In a real application, this would call a Supabase Edge Function
        // which would then securely call a third-party nutrition API.
        // I will simulate this call with a placeholder function.
        const nutritionData = await analyzeFoodPhoto(file);

        displayResults(nutritionData);

    } catch (error) {
        resultsContent.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze Photo';
    }
}

// --- Placeholder API Call ---
async function analyzeFoodPhoto(file) {
    console.log("Simulating analysis for file:", file.name);

    // This is a mock function. It simulates a delay and returns a fixed result.
    // In a real implementation, this would be replaced by a call to an Edge Function.
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                foodName: "Spaghetti Bolognese",
                calories: 550,
                protein: 25,
                carbs: 60,
                fat: 20
            });
        }, 2000); // Simulate 2-second API call
    });
}

function displayResults(data) {
    if (!data) {
        resultsContent.innerHTML = '<p>Could not analyze the food in the photo.</p>';
        return;
    }

    resultsContent.innerHTML = `
        <h3 class="text-xl font-bold">${data.foodName}</h3>
        <ul class="mt-4 space-y-2">
            <li><strong>Calories:</strong> ${data.calories} kcal</li>
            <li><strong>Protein:</strong> ${data.protein} g</li>
            <li><strong>Carbohydrates:</strong> ${data.carbs} g</li>
            <li><strong>Fat:</strong> ${data.fat} g</li>
        </ul>
    `;
}
