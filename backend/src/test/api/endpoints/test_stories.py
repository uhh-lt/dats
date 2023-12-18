import pytest
from fastapi.testclient import TestClient


@pytest.mark.order(1)
def test_project_add_user(client: TestClient, api_user, api_project) -> None:
    alice = api_user.create("alice")
    bob = api_user.create("bob")
    # charlie = api_user.create("charlie")

    project1 = api_project.create(alice, "project1")
    project2 = api_project.create(bob, "project2")

    # Add Bob to project1
    response_add_p1_bob = client.patch(
        f"/project/{project1["id"]}/user/{bob["id"]}", headers=alice["AuthHeader"]
    )
    assert response_add_p1_bob.status_code == 200

    # Alice changes project1 - failure
    change_p2_failure = {"title": "this", "description": "shouldn't work"}
    response_update_p2_alice_failure = client.patch(
        f"/project/{project2["id"]}",
        headers=alice["AuthHeader"],
        json=change_p2_failure,
    )
    assert response_update_p2_alice_failure.status_code == 403


@pytest.mark.order(2)
def test_project_update(client: TestClient, api_user, api_project) -> None:
    alice = api_user.userList["alice"]
    bob = api_user.userList["bob"]
    project1 = api_project.projectList["project1"]
    project2 = api_project.projectList["project2"]

    change_p2 = {"title": "this", "description": "should work"}
    # Add Alice to project1 and change title and description
    response_add_p2_alice = client.patch(
        f"/project/{project2["id"]}/user/{alice["id"]}", headers=bob["AuthHeader"]
    )
    assert response_add_p2_alice.status_code == 200

    response_update_p2_alice_success = client.patch(
        f"/project/{project2["id"]}", headers=alice["AuthHeader"], json=change_p2
    )
    assert response_update_p2_alice_success.status_code == 200

    # Change title and description of project1
    change_p1 = {"title": "its weird", "description": "innit?"}
    response_update_p1 = client.patch(
        f"/project/{project1["id"]}", headers=alice["AuthHeader"], json=change_p1
    )
    response_update_p1.status_code == 200

    # Change title and description of project2
    change_p2 = {"title": "You know the rules", "description": "and so do I"}
    response_update_p2 = client.patch(
        f"/project/{project2["id"]}", headers=bob["AuthHeader"], json=change_p2
    )
    response_update_p2.status_code == 200


@pytest.mark.order(3)
def test_user_update_remove(client: TestClient, api_user) -> None:
    charlie = api_user.create("charlie")

    # Update Charlie
    update_charlie = {
        "email": "bender@ilovebender.com",
        "first_name": "I.C.",
        "last_name": "Weiner",
        "password": "1077",
    }
    response_update_charlie = client.patch(
        f"/user/{charlie["id"]}", headers=charlie["AuthHeader"], json=update_charlie
    )
    assert response_update_charlie.status_code == 200

    # Remove Charlie - failure (changed email)
    response_remove_charlie_failure = client.delete(
        f"/user/{charlie["id"]}", headers=charlie["AuthHeader"]
    )
    assert response_remove_charlie_failure.status_code == 404

    # Relogin Charlie
    relogin_charlie = {
        "username": update_charlie["email"],
        "password": update_charlie["password"],
    }
    response_relogin_charlie = client.post(
        "/authentication/login", data=relogin_charlie
    ).json()
    AuthHeader_charlie = {
        "Authorization": f"{response_relogin_charlie["token_type"]} {response_relogin_charlie["access_token"]}"
    }

    # Remove Charlie
    response_remove_charlie = client.delete(
        f"/user/{charlie["id"]}", headers=AuthHeader_charlie
    )
    assert response_remove_charlie.status_code == 200


@pytest.mark.order(4)
def test_codes_create(client: TestClient, api_user, api_project, api_code) -> None:
    project1 = api_project.projectList["project1"]
    project2 = api_project.projectList["project2"]

    alice = api_user.userList["alice"]
    bob = api_user.userList["bob"]

    # Create codes in project1
    response_codes_project1_before = client.get(
        f"/project/{project1["id"]}/code", headers=alice["AuthHeader"]
    ).json()
    codes_project1_before = len(response_codes_project1_before)

    _ = api_code.create("code1", alice, project1)
    _ = api_code.create("code2", alice, project1)
    _ = api_code.create("code3", alice, project1)

    response_codes_project1_after = client.get(
        f"/project/{project1["id"]}/code", headers=alice["AuthHeader"]
    ).json()
    codes_project1_after = len(response_codes_project1_after)

    assert codes_project1_before + 3 == codes_project1_after

    # Create codes in project2
    response_codes_project2_before = client.get(
        f"/project/{project2["id"]}/code", headers=bob["AuthHeader"]
    ).json()
    codes_project2_before = len(response_codes_project2_before)
    _ = api_code.create("code4", bob, project2)
    _ = api_code.create("code5", bob, project2)
    _ = api_code.create("code6", bob, project2)

    response_codes_project2_after = client.get(
        f"/project/{project2["id"]}/code", headers=alice["AuthHeader"]
    ).json()
    codes_project2_after = len(response_codes_project2_after)

    assert codes_project2_before + 3 == codes_project2_after


@pytest.mark.order(5)
def test_document(api_user, api_project, api_document):
    alice = api_user.userList["alice"]
    project1 = api_project.projectList["project1"]

    # Upload two text documents
    helloWorld = "helloWorld.txt"
    filetwo = "filetwo.txt"
    doc_response = api_document.create([helloWorld, filetwo], alice, project1)
    helloWorld = doc_response[helloWorld]
    filetwo = doc_response[filetwo]

    # Upload two image documents
