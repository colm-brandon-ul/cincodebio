import pickle
import os

class Serializable:
    def save(self, filename):
        """
        Save the object to a file using pickle serialization.
        
        Args:
            filename (str): Path to the file where the object will be saved.
        """
        try:
            with open(filename, 'wb') as file:
                pickle.dump(self, file)
            print(f"Object saved successfully to {filename}")
        except Exception as e:
            print(f"Error saving object: {e}")
    
    @classmethod
    def load(cls, filename):
        """
        Load an object from a file.
        
        Args:
            filename (str): Path to the file containing the pickled object.
        
        Returns:
            The loaded object.
        """
        try:
            with open(filename, 'rb') as file:
                return pickle.load(file)
        except FileNotFoundError:
            print(f"File {filename} not found.")
            return None
        except Exception as e:
            print(f"Error loading object: {e}")
            return None