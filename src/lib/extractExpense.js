export async function extractExpenseFromText(text) {
    const response = await fetch("/api/extract-expense", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        throw new Error("Could not understand this expense.");
    }

    return response.json();
}

export async function extractExpenseFromImage(file) {
    const base64 = await fileToBase64(file);

    const response = await fetch("/api/extract-expense", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type,
        }),
    });

    if (!response.ok) {
        throw new Error("Could not read this receipt.");
    }

    return response.json();
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            resolve(reader.result.split(",")[1]);
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}