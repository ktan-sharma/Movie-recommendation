from flask import Flask, request, jsonify
import recommend_movies  # Assuming your main logic is in recommend_movies.py

app = Flask(__name__)
from flask_cors import CORS
CORS(app)

@app.route('/api/recommendations', methods=['GET'])
@app.route('/api/recommendations/', methods=['GET'])
def get_recommendations():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'Missing user_id'}), 400
    try:
        # Use the new API-friendly function
        recommendations = recommend_movies.get_recommendations_api(user_id)
        return jsonify({'recommendations': recommendations})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/')
def root():
    return 'API is running!'

print("recommend_api.py loaded!")
print(app.url_map)

if __name__ == '__main__':
    app.run(debug=True)
