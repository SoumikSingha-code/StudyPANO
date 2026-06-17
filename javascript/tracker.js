let totaltime = localStorage.getItem("activetime");
totaltime = totaltime ? parseFloat(totaltime) : 0;
let starttime = Date.now();
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        totaltime += (Date.now() - starttime);
        localStorage.setItem("activetime", totaltime);
    }
    else {
        starttime = Date.now();
    }
});
window.addEventListener("beforeunload", () => {
    totaltime += (Date.now() - starttime);
    localStorage.setItem("activetime", totaltime);
});
let now = Date.now();
let last = localStorage.getItem("activetime");
if (!last || (now - last) > 86400000) {
    localStorage.setItem("activetime", 0);
}