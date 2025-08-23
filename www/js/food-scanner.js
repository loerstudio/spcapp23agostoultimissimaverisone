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
        uploadText.textContent = 'Cambia Foto';
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
    resultsContent.innerHTML = '<p>Analisi della tua foto in corso, attendere prego...</p>';
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analisi in corso...';

    try {
        const nutritionData = await analyzeFoodPhoto(file);
        displayResults(nutritionData);

    } catch (error) {
        resultsContent.innerHTML = `<p class="text-red-500">Errore: ${error.message}</p>`;
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analizza Foto';
    }
}

// --- Real API Call to Edge Function ---
async function analyzeFoodPhoto(file) {
    // Convert file to base64
    const reader = new FileReader();
    const base64String = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // Invoke the Edge Function
    const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: { imageBase64: base64String },
    });

    if (error) {
        throw new Error(`Function error: ${error.message}`);
    }

    // The Edge function might return an error object in its body
    if (data.error) {
        throw new Error(data.error);
    }

    return data;
}

function displayResults(data) {
    if (!data || !data.foodName) {
        resultsContent.innerHTML = '<p>Impossibile analizzare il cibo nella foto. Prova con un\'immagine più chiara.</p>';
        return;
    }

    resultsContent.innerHTML = `
        <h3 class="text-xl font-bold">${data.foodName}</h3>
        <ul class="mt-4 space-y-2">
            <li><strong>Calorie:</strong> ${data.calories || 'N/A'} kcal</li>
            <li><strong>Proteine:</strong> ${data.protein || 'N/A'} g</li>
            <li><strong>Carboidrati:</strong> ${data.carbs || 'N/A'} g</li>
            <li><strong>Grassi:</strong> ${data.fat || 'N/A'} g</li>
        </ul>
    `;
}
