app.post('/api/descriptions', async (req, res) => {
    const { name, html, css, js, combinedHTML } = req.body;

    try {
        await db.collection('descriptions').insertOne({ name, html, css, js, combinedHTML });
        res.status(201).send({ message: 'Description saved successfully.' });
    } catch (error) {
        console.error('Error saving description:', error);
        res.status(500).send({ error: 'Failed to save description.' });
    }
});

app.get('/api/descriptions', async (req, res) => {
    try {
        const descriptions = await db.collection('descriptions').find().toArray();
        res.status(200).send(descriptions);
    } catch (error) {
        console.error('Error fetching descriptions:', error);
        res.status(500).send({ error: 'Failed to fetch descriptions.' });
    }
});

app.delete('/api/descriptions', async (req, res) => {
    const { name } = req.body;

    try {
        await db.collection('descriptions').deleteOne({ name });
        res.status(200).send({ message: 'Description deleted successfully.' });
    } catch (error) {
        console.error('Error deleting description:', error);
        res.status(500).send({ error: 'Failed to delete description.' });
    }
});
