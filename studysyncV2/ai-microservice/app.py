from flask import Flask, request, jsonify
import numpy as np
from scipy.spatial.distance import cosine

app = Flask(__name__)

def user_vector(user):
    age_norm = (user['age'] - 18) / 12 if user.get('age') else 0
    levels = {'Freshman': 0, 'Sophomore': 1, 'Junior': 2, 'Senior': 3, 'Graduate': 4}
    level = levels.get(user.get('academic_level', ''), 0) / 4
    field_hash = hash(user.get('field_of_study', '')) % 10 / 10
    style_hash = hash(user.get('learning_style', '')) % 10 / 10
    sched_hours = len(user.get('schedule', {})) / 7
    return np.array([age_norm, level, field_hash, style_hash, sched_hours])

@app.route('/match', methods=['POST'])
def match():
    data = request.json
    current = data['current']
    others = data['others']
    
    current_vec = user_vector(current)
    matches = []
    for other in others:
        other_vec = user_vector(other)
        similarity = 1 - cosine(current_vec, other_vec)
        if similarity > 0.5:  # Threshold from 89% AI interest
            matches.append({'id': other['id'], 'email': other['email'], 'compatibility': round(similarity, 2)})
    
    matches.sort(key=lambda x: x['compatibility'], reverse=True)
    return jsonify({'matches': matches[:5]})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)