const openPopupBtn = document.getElementById('openPopup');
const closePopupBtn = document.getElementById('closePopup');
const popup = document.getElementById('popup');
const overlay = document.getElementById('overlay');

closePopupBtn.addEventListener('click', () => {
    popup.style.display = 'none';
    overlay.style.display = 'none';
});


closePopupBtn.addEventListener('mouseover', () => {
    closePopupBtn.style.opacity = 0.5;
});

closePopupBtn.addEventListener('mouseout', () => {
    closePopupBtn.style.opacity = 1;
});

openPopupBtn.addEventListener('click', () => {
    popup.style.display = 'block';
    overlay.style.display = 'block';
});

openPopupBtn.addEventListener('mouseover', () => {
    openPopupBtn.style.opacity = 0.5;
});

openPopupBtn.addEventListener('mouseout', () => {
    openPopupBtn.style.opacity = 1;
});

overlay.addEventListener('click', () => {
    popup.style.display = 'none';
    overlay.style.display = 'none';
});