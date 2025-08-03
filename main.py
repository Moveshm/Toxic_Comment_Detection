from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import re

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change "*" to specific frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Load toxic words dataset from Excel
EXCEL_FILE = "toxic_words.xlsx"

try:
    df = pd.read_excel(EXCEL_FILE, engine="openpyxl")

    # Convert toxic words to lowercase for case-insensitive matching
    df["Toxic Word"] = df["Toxic Word"].astype(str).str.lower().str.strip()

    # Create a dictionary where each toxic word has a list of 3 non-toxic alternatives
    toxic_dict = {
        row["Toxic Word"]: [
            str(row["Non-Toxic Alternatives 1"]).strip(),
            str(row["Non-Toxic Alternatives 2"]).strip(),
            str(row["Non-Toxic Alternatives 3"]).strip(),
        ]
        for _, row in df.iterrows()
    }

    toxic_words_list = list(toxic_dict.keys())  # Store all toxic words in a list

except Exception as e:
    raise Exception(f"❌ Error loading dataset: {e}")

# Request Model
class CommentRequest(BaseModel):
    text: str

# Enhanced function to check toxicity for multi-language support
def check_toxicity(text):
    words = re.split(r'\s+', text)  # Improved split logic for Tamil and Unicode
    toxic_words = []
    suggestions = {}

    for word in words:
        lower_word = word.lower().strip()
        if lower_word in toxic_dict:
            toxic_words.append(word)
            suggestions[word] = toxic_dict[lower_word]

    return toxic_words, suggestions


@app.post("/check_comment/")
async def check_comment(request: CommentRequest):
    text = request.text
    toxic_words, suggestions = check_toxicity(text)

    if not toxic_words:
        return {"status": "clean", "text": text, "highlighted": text, "suggestions": {}}

    # Highlight toxic words in red (Works for all languages)
    highlighted_text = text
    for word in toxic_words:
        highlighted_text = re.sub(rf"\b{re.escape(word)}\b", f"<span style='color:red'>{word}</span>", highlighted_text, flags=re.IGNORECASE)

    return {
        "status": "toxic",
        "text": text,
        "highlighted": highlighted_text,
        "suggestions": suggestions
    }

@app.post("/validate_comment/")
async def validate_comment(request: CommentRequest):
    text = request.text
    toxic_words, _ = check_toxicity(text)

    if toxic_words:
        return {"status": "rejected", "message": "Comment still contains toxic words!"}
    
    return {"status": "approved", "message": "Comment is clean and can be posted!"}

# Run FastAPI server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)