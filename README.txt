CERMS TensorFlow.js Teachable Machine model export

Copy the included public folder into the root of your CERMS Vite project.
The model files should end up at:
public/models/waste-severity/model.json
public/models/waste-severity/metadata.json
public/models/waste-severity/weights.bin

Do not rename or separate the files. model.json references weights.bin.

Export metadata labels:
Low
Moderate
High
No Waste Detected
Not Waste

Important:
This is the model exactly as exported from Teachable Machine. The two non-severity labels require an agreed meaning in CERMS before integration. The exported ZIP proves that a model has been trained/exported, but does not establish reliable accuracy. Validate with unseen photos and a larger, representative dataset before using it as a dependable decision tool.
