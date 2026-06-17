document.addEventListener("DOMContentLoaded", function () {
    const timeElement = document.getElementById("currentTime");
    const currentTime = new Date().toLocaleTimeString();
    timeElement.textContent = "CURRENT TIME: " + currentTime;
});
function updateTime() {
    const timeElement = document.getElementById("currentTime");
    const currentTime = new Date().toLocaleTimeString();
    timeElement.textContent = "CURRENT TIME: " + currentTime;
}

// Run once immediately
updateTime();

// Then update every second
setInterval(updateTime, 1000);

(function () {
    const subject = document.body.dataset.subject || document.title;
    const idleLimit = 60000; // 1 min idle
    let startTime = Date.now();
    let activeTime = 0;
    let isActive = true;

    const timerDisplay = document.getElementById("timeSpent");

    setInterval(() => {
        let displayTime = activeTime;
        if (isActive) displayTime += Date.now() - startTime;
        const minutes = Math.floor(displayTime / 1000 / 60);
        const seconds = Math.floor((displayTime / 1000) % 60);
        if (timerDisplay) timerDisplay.innerText = `${minutes} min ${seconds} sec`;
    }, 1000);

    window.addEventListener("beforeunload", () => {
        if (isActive) activeTime += Date.now() - startTime;

        let sessions = JSON.parse(localStorage.getItem("studySessions") || "{}");
        const today = new Date().toISOString().split("T")[0];

        if (!sessions[today]) sessions[today] = {};
        if (!sessions[today][subject]) sessions[today][subject] = 0;

        sessions[today][subject] += activeTime;
        localStorage.setItem("studySessions", JSON.stringify(sessions));
    });
})();
function Searchcontent() {
    let input = document.getElementById("searchbar").value.toLowerCase();
    let items = document.getElementsByClassName("op");
    let nf = document.getElementsByClassName("nf");
    for (let i = 0; i < items.length; i++) {
        let text = items[i].textContent.toLowerCase();
        if (text.includes(input)) {
            items[i].style.display = "flex";
        }
        else {
            items[i].style.display = "none";
        }
    }
}
let focus = localStorage.getItem("focus") === "true";
if (focus) {
    enablefocus();
}
function enablefocus() {
    document.body.classList.add("focus-mode");
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    }
}
function disablefocus() {
    document.body.classList.remove("focus-mode");
    if (document.exitFullscreen) {
        document.exitFullscreen();
    }
}
function uplp() {
    document.getElementById("upload").classList.remove("show");
}
function upload() {
    document.getElementById("upload").classList.add("show");
    document.getElementById("upl").classList.add("hide");
}
function optionshower() {
    const option = document.getElementById("option");
    option.classList.toggle("show");
}
function openlis() {
    document.getElementById("optf").classList.add("sh");
    document.getElementById("optionlog").classList.add("show");

}
function remo() {
    document.getElementById("optf").classList.remove("sh");
    document.getElementById("optionlog").classList.remove("show");
}

// Global showMessage utility (for module scripts too)
window.showMessage = function (text, bgColor, duration = 3000) {
    const msg = document.getElementById("msg");
    if (!msg) {
        console.warn("showMessage: #msg element not found");
        return;
    }
    msg.style.display = "flex";
    msg.innerText = text;
    msg.style.background = bgColor;
    setTimeout(() => {
        msg.style.display = "none";
    }, duration);
};

// the previous local variable reference is no longer used
// const msg = document.getElementById("msg");
const fileInput = document.getElementById("cameraUpload");
const uploadBox = document.getElementById("ulpp");
const fileI = document.getElementById("fileUpload");
// Drag & Drop
uploadBox.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadBox.style.border = "2px dashed cyan"; // highlight when dragging
});

uploadBox.addEventListener("dragleave", (e) => {
    e.preventDefault();
    uploadBox.style.border = "1px solid black"; // reset border
});

uploadBox.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFile(file);
});

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    const filei = fileI.files[0];
    handleFilec(file);
    handleFile(filei);
});

fileI.addEventListener("change", () => {
    const filei = fileI.files[0];
    handleFile(filei);
});
function handleFilec(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showMessage("File too large. Maximum 5MB allowed.", "red");
        return;
    }

    const reader = new FileReader();
    const option = document.getElementById("option");
    option.classList.remove("show");
    reader.onload = function (e) {

        if (file.type.startsWith("image/")) {
            uploadBox.innerHTML = `
                <img src="${e.target.result}">
                <button class="removeBtn">×</button>`;
        }

        else {
            showMessage("Only pictures and pdfs can be sent.", "red");
        }
        document.querySelector(".removeBtn").addEventListener("click", (event) => {
            event.preventDefault();
            uploadBox.innerHTML = "Picture or File Preview";
            fileInput.value = "";
        });
    };
    reader.readAsDataURL(file);

}
function handleFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showMessage("File too large. Maximum 5MB allowed.", "red");
        return;
    }
    const reader = new FileReader();
    const option = document.getElementById("option");
    option.classList.remove("show");
    reader.onload = function (e) {
        if (file.type.startsWith("image/")) {
            uploadBox.innerHTML = `
                <img src="${e.target.result}">
                <button class="removeBtn">×</button>`;
        }

        else if (file.type == "application/pdf") {
            uploadBox.innerHTML = `
                <iframe src="${e.target.result}"><iframe>
                <button class="removeBtn">×</button>`;
        }

        else {
            showMessage("Only pictures and pdfs can be sent.", "red");
        }
        document.querySelector(".removeBtn").addEventListener("click", (event) => {
            event.preventDefault();
            uploadBox.innerHTML = "Picture or File Preview";
            fileI.value = "";
        });
    };
    reader.readAsDataURL(file);
}
function goToEmail() {
    window.location.href = "../Login.html";
}