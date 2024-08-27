import speech_recognition as sr
import keyboard
import pyperclip
import threading
import time

recognizing = False
stop_event = threading.Event()

def recognize_speech():
    global recognizing
    recognizer = sr.Recognizer()
    
    while not stop_event.is_set():
        with sr.Microphone() as source:
            print("Poslouchám...")
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            try:
                audio = recognizer.listen(source, timeout=None, phrase_time_limit=None)
                text = recognizer.recognize_google(audio, language="cs-CZ")
                print(f"Rozpoznaný text: {text}")
                pyperclip.copy(text)
                keyboard.write(text + " ")
            except sr.UnknownValueError:
                print("Nebylo možné rozpoznat řeč")
            except sr.RequestError as e:
                print(f"Chyba při požadavku na Google Speech Recognition service; {e}")

def toggle_recognition():
    global recognizing
    if not recognizing:
        recognizing = True
        stop_event.clear()
        threading.Thread(target=recognize_speech).start()
        print("Rozpoznávání zapnuto")
    else:
        recognizing = False
        stop_event.set()
        print("Rozpoznávání vypnuto")

# Nastavení klávesové zkratky
keyboard.add_hotkey('alt+\\', toggle_recognition)

print("Skript je připraven. Stiskněte Alt+\\ pro zapnutí/vypnutí rozpoznávání řeči.")
keyboard.wait()