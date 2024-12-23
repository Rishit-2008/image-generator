const API_URL = 'endpoint_url';
const API_KEY = 'api_key';

const promptInput = document.getElementById('prompt');
const generateButton = document.getElementById('generate');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const gallery = document.getElementById('gallery');


window.addEventListener('load', () => {
    const storedImages = JSON.parse(localStorage.getItem('imageGallery')) || [];
    storedImages.forEach(({ base64, prompt }) => {
        addImageToGallery(base64, prompt, false);
    });
});

generateButton.addEventListener('click', generateImage);

async function generateImage() {
    const prompt = promptInput.value.trim();
    if (!prompt) {
        showError('Please enter a prompt');
        return;
    }

    generateButton.disabled = true;
    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}?prompt=${encodeURIComponent(prompt)}`, {
            headers: {
                'X-API-KEY': API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const blob = await response.blob();
        const base64 = await blobToBase64(blob);

        addImageToGallery(base64, prompt);

        promptInput.value = '';

    } catch (error) {
        showError('Failed to generate image. Please try again.');
        console.error('Error:', error);
    } finally {
        generateButton.disabled = false;
        loadingDiv.style.display = 'none';
    }
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function addImageToGallery(base64, prompt, saveToLocalStorage = true) {
    const container = document.createElement('div');
    container.className = 'image-container';

    const img = document.createElement('img');
    img.src = base64;
    img.className = 'generated-image';
    img.alt = prompt;

    const promptText = document.createElement('p');
    promptText.className = 'prompt-text';
    promptText.textContent = prompt;

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-btn';
    deleteButton.textContent = 'X';
    deleteButton.addEventListener('click', () => {
        container.remove();
        deleteImageFromLocalStorage(base64);
    });

    container.appendChild(img);
    container.appendChild(promptText);
    container.appendChild(deleteButton);
    gallery.insertBefore(container, gallery.firstChild);

    if (saveToLocalStorage) {
        saveImageToLocalStorage(base64, prompt);
    }
}

function saveImageToLocalStorage(base64, prompt) {
    const storedImages = JSON.parse(localStorage.getItem('imageGallery')) || [];
    storedImages.push({ base64, prompt });
    localStorage.setItem('imageGallery', JSON.stringify(storedImages));
}

function deleteImageFromLocalStorage(base64) {
    const storedImages = JSON.parse(localStorage.getItem('imageGallery')) || [];
    const updatedImages = storedImages.filter(image => image.base64 !== base64);
    localStorage.setItem('imageGallery', JSON.stringify(updatedImages));
}

async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

promptInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        generateImage();
    }
});
