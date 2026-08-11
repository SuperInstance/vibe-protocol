import sys
import os

# Add the python directory to sys.path so `from vibe import ...` works
# and the relative imports in vibe_protocol.py resolve correctly
python_dir = os.path.join(os.path.dirname(__file__), "..", "..", "python")
sys.path.insert(0, python_dir)
