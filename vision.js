const express = require("express");
const router = express.Router();
const vision = require("@google-cloud/vision");
require("dotenv").config();


// Creates a client
const client = new vision.ImageAnnotatorClient({
  credentials: {
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
});

router.post("/", async (req, res) => {
  try {
    if (!req.body.imageURL) {
      return res.status(400).send("Missing image URL");
    }

    // The imageURL is a data URL in the form "data:image/jpeg;base64,..."
    // Extract the Base64-encoded string and convert it to a Buffer
    const image = Buffer.from(req.body.imageURL.split(",")[1], "base64");

    // Now we can use the image data with the Vision API
    const [result] = await client.objectLocalization(image);
    const objects = result.localizedObjectAnnotations;

    // Send the objects to the client
    res.status(200).send(objects);
  } catch (error) {
    console.error("Error detecting image", error);
    res.status(500).send("Error detecting image" + error.message);
  }
});

module.exports = router;
