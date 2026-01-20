const GEOAPIFY_API_KEY = 'e398041403a845a18f2948f7a9d347f4';
const query = 'Rua Barão do Cerro Azul';

async function testGeoapify() {
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&filter=countrycode:br&lang=pt&limit=5&apiKey=${GEOAPIFY_API_KEY}`;
    console.log("Testing URL:", url);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            return;
        }
        const data = await response.json();
        console.log("Success! Found:", data.features?.length || 0, "results");
        if (data.features?.length > 0) {
            console.log("First result:", data.features[0].properties.formatted);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

testGeoapify();
