import axios from 'axios';

const API_URL = 'http://localhost:8000/api/users/';

const signup = (email, password, firstName, lastName) => {
    return axios.post(API_URL + 'signup', {
        email,
        password,
        user_first_name: firstName,
        user_last_name: lastName,
    });
};

const login = (email, password) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    return axios.post(API_URL + 'login', params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    }).then((response) => {
        if (response.data.access_token) {
            localStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
    });
};

const logout = () => {
    localStorage.removeItem('user');
};

const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem('user'));
};

const authService = {
    signup,
    login,
    logout,
    getCurrentUser,
};

export default authService;
