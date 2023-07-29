const express = require("express");
const router = express.Router();
const vision = require('@google-cloud/vision');

// Creates a client
const client = new vision.ImageAnnotatorClient();

router.post("/", async (req, res) => {
  try {
    if (!req.body.imageURL) {
      return res.status(400).send("Missing image URL");
    }

    // The imageURL is a data URL in the form "data:image/jpeg;base64,..."
    // Extract the Base64-encoded string and convert it to a Buffer
    const image = Buffer.from(req.body.imageURL.split(",")[1], "base64");

    // Now we can use the image data with the Vision API
    const [result] = await client.labelDetection(image);
    const labels = result.labelAnnotations;

    // Send the labels to the client
    res.status(200).send(labels);
  } catch (error) {
    console.error("Error detecting image", error);
    res.status(500).send("Error detecting image" + error.message);
  }
});

module.exports = router;
