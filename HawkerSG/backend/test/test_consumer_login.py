import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.models.user_model import User as DBUser

# Initilise mock data and db session
@pytest.fixture
def mock_db_session():
    return MagicMock(spec=Session)

@pytest.fixture
def mock_consumer_user():
    mock_user = MagicMock(spec=DBUser)
    mock_user.id = 1
    mock_user.email = "test.consumer@example.com"
    mock_user.hashed_password = "hashed_consumer_password"
    mock_user.user_type = "consumer"
    mock_user.username = "TestConsumer" 
    mock_user.profile_pic = None
    mock_user.recentlySearch = ""
    return mock_user

@pytest.fixture
def mock_business_user():
    mock_user = MagicMock(spec=DBUser)
    mock_user.id = 2
    mock_user.email = "test.business@example.com"
    mock_user.hashed_password = "hashed_business_password"
    mock_user.user_type = "business"
    mock_user.username = "TestBusiness"
    return mock_user

@pytest.fixture
def consumer_form_data():
    return OAuth2PasswordRequestForm(
        username="test.consumer@example.com", 
        password="correctpassword", 
        scope="", 
        client_id=None, 
        client_secret=None
    )

@pytest.fixture
def consumer_form_data_wrong_password():
    return OAuth2PasswordRequestForm(
        username="test.consumer@example.com", 
        password="incorrectpassword",
        scope="", 
        client_id=None, 
        client_secret=None
    )


# ==============================================================================
# BLACK BOX TESTING: EQUIVALENCE CLASS PARTITIONING (ECP) TESTS
# ==============================================================================

# Test Case 1: Valid Login (Success Path) - 200
@patch('app.routes.consumer_route.consumer_controller.get_user_by_email')
@patch('app.routes.consumer_route.consumer_controller.verify_password', return_value=True)
@patch('app.routes.consumer_route.create_access_token', return_value="MOCKED_JWT_TOKEN")
def test_case_1_valid_login(
    mock_create_token, mock_verify_password, mock_get_user,
    mock_db_session, consumer_form_data, mock_consumer_user
):
    # Setup mocks
    mock_get_user.return_value = mock_consumer_user

    # Import the function under test inside the patch scope
    from app.routes.consumer_route import login_user
    
    # Run the function
    response = login_user(form_data=consumer_form_data, db=mock_db_session)
    
    # Assertions
    mock_get_user.assert_called_once_with(mock_db_session, "test.consumer@example.com")
    mock_verify_password.assert_called_once_with("correctpassword", "hashed_consumer_password")
    
    assert response["access_token"] == "MOCKED_JWT_TOKEN"
    assert response["token_type"] == "bearer"
    assert response["user"] == mock_consumer_user 


# Test Case 2: User Not Found (Incorrect Email) - 401
@patch('app.routes.consumer_route.consumer_controller.get_user_by_email')
def test_case_2_invalid_user(mock_get_user, mock_db_session, consumer_form_data):
    # Setup mocks: User lookup returns None
    mock_get_user.return_value = None

    from app.routes.consumer_route import login_user

    with pytest.raises(HTTPException) as excinfo:
        login_user(form_data=consumer_form_data, db=mock_db_session)
        
    # Assertions
    assert excinfo.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert excinfo.value.detail == "Incorrect email or password"
    mock_get_user.assert_called_once()


# Test Case 3: Incorrect Password - 401
@patch('app.routes.consumer_route.consumer_controller.get_user_by_email')
@patch('app.routes.consumer_route.consumer_controller.verify_password', return_value=False)
def test_case_3_invalid_password(
    mock_verify_password, mock_get_user, 
    mock_db_session, consumer_form_data_wrong_password, mock_consumer_user
):
    # Setup mocks: User found, but password verification fails (due to mock)
    mock_get_user.return_value = mock_consumer_user
    
    from app.routes.consumer_route import login_user
    
    with pytest.raises(HTTPException) as excinfo:
        login_user(form_data=consumer_form_data_wrong_password, db=mock_db_session) # Use the new fixture
        
    # Assertions
    assert excinfo.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert excinfo.value.detail == "Incorrect email or password"
    # Verify the mock function was called with the known wrong password
    mock_verify_password.assert_called_once_with("incorrectpassword", "hashed_consumer_password") 


# Test Case 4: User is correct but is the wrong type ('business') - 401
@patch('app.routes.consumer_route.consumer_controller.get_user_by_email')
@patch('app.routes.consumer_route.consumer_controller.verify_password', return_value=True)
def test_case_4_invalid_usertype(
    mock_verify_password, mock_get_user, 
    mock_db_session, consumer_form_data, mock_business_user
):
    # Setup mocks: Business user found, password verified (Path 3 validation check)
    mock_get_user.return_value = mock_business_user
    
    from app.routes.consumer_route import login_user
    
    with pytest.raises(HTTPException) as excinfo:
        login_user(form_data=consumer_form_data, db=mock_db_session)
        
    # Assertions
    assert excinfo.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert excinfo.value.detail == "Incorrect email or password"
    # Ensure password verification happened, but type check failed
    mock_verify_password.assert_called_once()

# python -m pytest test/test_consumer_login.py