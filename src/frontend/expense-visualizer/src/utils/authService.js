import axios from 'axios';

const API_URL = 'http://localhost:8000/api/users/';

const signup = (email, password, firstName, lastName, mobileNumber) => {
    return axios.post(API_URL + 'signup', {
        email,
        password,
        user_first_name: firstName,
        user_last_name: lastName,
        mobile_phone_number: mobileNumber,
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

const updateUser = (firstName, lastName, mobileNumber) => {
    return axios.put(API_URL + 'me', {
        user_first_name: firstName,
        user_last_name: lastName,
        mobile_phone_number: mobileNumber,
    });
};

const changePassword = (oldPassword, newPassword, confirmNewPassword) => {
    return axios.put(API_URL + 'me/password', {
        old_password: oldPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
    });
};

const authService = {
    signup,
    login,
    logout,
    getCurrentUser,
    updateUser,
    changePassword,
};

export default authService;
