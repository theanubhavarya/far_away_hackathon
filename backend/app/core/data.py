CITY_DATA = {
    "Delhi": ("New Delhi Railway Station", "NDLS", "Indira Gandhi International Airport", 28.6139, 77.2090),
    "New Delhi": ("New Delhi Railway Station", "NDLS", "Indira Gandhi International Airport", 28.6139, 77.2090),
    "Mumbai": ("Chhatrapati Shivaji Maharaj Terminus", "CSMT", "Chhatrapati Shivaji Maharaj International Airport", 19.0760, 72.8777),
    "Bangalore": ("Yeshwanthpur Junction", "YPR", "Kempegowda International Airport", 12.9716, 77.5946),
    "Bengaluru": ("Yeshwanthpur Junction", "YPR", "Kempegowda International Airport", 12.9716, 77.5946),
    "Chennai": ("Chennai Central", "MAS", "Chennai International Airport", 13.0827, 80.2707),
    "Hyderabad": ("Secunderabad Junction", "SC", "Rajiv Gandhi International Airport", 17.3850, 78.4867),
    "Kolkata": ("Howrah Junction", "HWH", "Netaji Subhas Chandra Bose International Airport", 22.5726, 88.3639),
    "Pune": ("Pune Junction", "PUNE", "Pune International Airport", 18.5204, 73.8567),
    "Ahmedabad": ("Ahmedabad Junction", "ADI", "Sardar Vallabhbhai Patel International Airport", 23.0225, 72.5714),
    "Jaipur": ("Jaipur Junction", "JP", "Jaipur International Airport", 26.9124, 75.7873),
    "Goa": ("Madgaon Junction", "MAO", "Dabolim Airport", 15.2993, 74.1240),
    "Kochi": ("Ernakulam Junction", "ERS", "Cochin International Airport", 9.9312, 76.2673),
    "Lucknow": ("Lucknow Charbagh", "LKO", "Chaudhary Charan Singh International Airport", 26.8467, 80.9462),
    "Bhopal": ("Bhopal Junction", "BPL", "Raja Bhoj Airport", 23.2599, 77.4126),
    "Indore": ("Indore Junction", "INDB", "Devi Ahilya Bai Holkar Airport", 22.7196, 75.8577),
    "Chandigarh": ("Chandigarh Junction", "CDG", "Chandigarh International Airport", 30.7333, 76.7794),
    "Udaipur": ("Udaipur City", "UDZ", "Maharana Pratap Airport", 24.5854, 73.7125),
    "Manali": ("Chandigarh Junction", "CDG", "Bhuntar Airport", 32.2432, 77.1892),
    "Rishikesh": ("Haridwar Junction", "HW", "Jolly Grant Airport", 30.0869, 78.2676),
    "Ooty": ("Udagamandalam", "UAM", "Coimbatore International Airport", 11.4102, 76.6950),
}

ALIASES = {
    "new delhi": "Delhi",
    "delhi": "Delhi",
    "bengaluru": "Bangalore",
    "bangalore": "Bangalore",
    "bombay": "Mumbai",
}

TRANSPORT_RELIABILITY = {"flight": 0.85, "train": 0.88, "bus": 0.80, "cab": 0.92}
CARBON_PER_MINUTE = {"flight": 850, "train": 110, "bus": 180, "cab": 260}
