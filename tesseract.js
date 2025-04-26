var Tesseract = require('tesseract.js');
var request = require('native-request');
var fs = require('fs');
var path = require("path");

module.exports = function(RED)
{
	function TesseractNode(config)
	{
		RED.nodes.createNode(this, config);
		this.language = config.language;
		this.tessedit_char_whitelist = config.tessedit_char_whitelist;
		var node = this;
		node.on('input', async function(msg)
		{
			// Download URL
			if (/^http(s?):\/\//.test(msg.payload))
			{
				node.status({fill: "blue", shape: "dot", text: "downloading image"});
				request({url:msg.payload, encoding: null}, async function(err, res, body)
				{
					if (err)
					{
						node.error("Encountered error while downloading image file. " + err.message);
					}
					msg.payload = body;
					await Recognize(msg);
				});
			}
			// Open file on local file system
			else if (typeof msg.payload == "string")
			{
				if (fs.existsSync(msg.payload))
				{
					await Recognize(msg);
				}
				else
				{
					node.error("Referenced image file does not exist.");
				}
			}
			// Buffer
			else
			{
				await Recognize(msg);
			}
		});
		async function Recognize(msg)
		{
			// Update status - Starting
			node.status({fill: "blue", shape: "dot", text: "performing ocr"});
			// Initiate Tesseract.js
			const worker = await Tesseract.createWorker(node.language);
			// Apply config
			if (node.tessedit_char_whitelist != "") {
				await worker.setParameters({tessedit_char_whitelist: node.tessedit_char_whitelist})
			}
			// Perform OCR
			const result = await worker.recognize(msg.payload, {}, { hocr: true })
			node.message
			{
				msg.payload = result.data.text;
				msg.tesseract = result.data
				//{
				//	text: result.data.text,
				//	confidence: result.data.confidence,
				//	version: result.data.version,
				//};
				await worker.terminate();
				node.send(msg);
				// Update status - Done
				node.status({});
			};
		}
	}
	RED.nodes.registerType("tesseract", TesseractNode);
}
