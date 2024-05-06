import random
import string

def generate_serial_number(suffix):
    # Characters to be included in the serial number
    chars = string.ascii_uppercase + string.digits

    # Generate the main part of the serial number (12 characters long)
    serial_number = ''.join(random.choice(chars) for _ in range(12))

    # Combine the serial number with the chosen suffix
    full_serial_number = serial_number + suffix

    return full_serial_number

# Example usage
for i in range(100):
    print(generate_serial_number("|90"))