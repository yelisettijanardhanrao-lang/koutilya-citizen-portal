document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  const button = document.getElementById("submit");
  const status = document.getElementById("status");

  const dateInput = form.querySelector('input[name="executionDate"]');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    button.disabled = true;
    status.textContent = "Generating PDF...";

    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch(
        "/api/pdf/one-same-person-affidavit",
        {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(data)
        }
      );

      if (!response.ok) {
        let message = "PDF generation failed";
        try {
          const result = await response.json();
          message = result.message || message;
        } catch (_) {}
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "One_Same_Person_Affidavit.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      status.textContent = "PDF generated successfully.";
    } catch (error) {
      console.error(error);
      status.textContent = error.message || "PDF generation failed.";
    } finally {
      button.disabled = false;
    }
  });
});
