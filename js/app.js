document.addEventListener("DOMContentLoaded", () => {
    fetch("componentesHTML/navbar.html")
        .then(response => response.text())
        .then(data => {
        document.getElementById("navbar").innerHTML = data;
        })
        .catch(error => console.error("Error al cargar el navbar:", error));

    fetch("componentesHTML/footer.html")
        .then(response => response.text())
        .then(data => {
        document.getElementById("footer").innerHTML = data;
        })
        .catch(error => console.error("Error al cargar el footer:", error)
    );
});
