const iner = document.getElementById("move");
document.addEventListener("DOMContentLoaded", () => {
    const f = localStorage.getItem("focus") === "true";
    if (f) {
        document.body.classList.add("focus-mode");
        const btn = document.getElementById("Focus");
        if (btn) {
            iner.style.left = "0px";
            Focus.style.background = "none";
            iner.style.background = "#e0e0e0";
        }
    }
});

const Focus = document.getElementById("Focus");
Focus.addEventListener("click", () => {
    let focenb = localStorage.getItem("focus") === "true";
    if (!focenb) {
        localStorage.setItem("focus", "true");
        enablefocus();
        iner.style.left = "50px";
        Focus.style.background = "#e0e0e0";
        iner.style.background = "#121212";
    }
    else {
        localStorage.setItem("focus", "false");
        disablefocus();
        iner.style.left = "0px";
        Focus.style.background = "none";
        iner.style.background = "#e0e0e0";
    }

});

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
