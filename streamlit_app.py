import streamlit as st
import speech_recognition as sr
from gtts import gTTS
import os
from io import BytesIO
import base64
from pydub import AudioSegment
from pydub.playback import play

# Dummy predict function for testing
def predict(text):
    return "This is a dummy translation for: " + text

# Function to capture voice input
def get_voice_input():
    r = sr.Recognizer()
    with sr.Microphone() as source:
        st.info("Listening... please speak Hinglish")
        audio = r.listen(source, phrase_time_limit=5)
    try:
        text = r.recognize_google(audio)
        st.success(f"You said: {text}")
        return text
    except:
        st.error("Sorry, I couldn't understand the audio.")
        return ""

# Function to play translated English as speech
def speak_output(text):
    tts = gTTS(text)
    tts.save("output.mp3")
    audio = AudioSegment.from_file("output.mp3")
    play(audio)
    os.remove("output.mp3")

# Add toggle for voice mode
voice_mode = st.sidebar.checkbox("🎙️ Enable Voice Mode")

if voice_mode:
    input_text = get_voice_input()
else:
    input_text = st.text_input("Enter Hinglish sentence")

# Translate only if input is provided
if input_text:
    translated = predict(input_text)
    st.write("**Translated English:**", translated)
    
    # Optional TTS playback
    if st.button("🔊 Hear Translation"):
        speak_output(translated)
