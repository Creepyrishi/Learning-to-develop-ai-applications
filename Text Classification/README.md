1.  **Load Data:** Loaded the AG News Classification dataset from Kaggle using `kagglehub`.
2.  **Data Preparation:**
    *   Loaded both the training (`train.csv`) and testing (`test.csv`) datasets.
    *   Inspected the data using `.info()` and `.head()`.
    *   Adjusted the 'Class Index' by subtracting 1 to make it 0-indexed.
3.  **Text Encoding:** Used the `sentence-transformers` library with the "all-mpnet-base-v2" model to create numerical embeddings for the 'Description' column of both the training and testing datasets.
4.  **Logistic Regression Model:**
    *   Initialized a `LogisticRegression` model from scikit-learn.
    *   Trained the model using the encoded training data and the corresponding class indices.
    *   Evaluated the model's accuracy on the test data.
5.  **Neural Network Model:**
    *   Defined a custom neural network model (`myModel`) using PyTorch with linear layers, ReLU activations, and dropout.
    *   Created custom `Dataset` and `DataLoader` classes to handle the encoded data and labels for PyTorch.
    *   Instantiated the neural network model, defined the `CrossEntropyLoss` function and the `Adam` optimizer.
    *   Trained the neural network model for 10 epochs, monitoring both training and testing loss.
    *   Evaluated the neural network model's accuracy on the test data.
