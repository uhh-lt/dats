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
    # TODO: Missing testcases
    alice = api_user.userList["alice"]
    project1 = api_project.projectList["project1"]

    # Upload text to project1
    # https://de.wikipedia.org/wiki/Erde
    textd1 = ("https://de.wikipedia.org/wiki/Erde", "Erde – Wikipedia.html")
    # https://de.wikipedia.org/wiki/Hauskatze
    textd2 = ("https://de.wikipedia.org/wiki/Hauskatze", "Hauskatze – Wikipedia.html")
    doc_response = api_document.create([textd1, textd2], alice, project1)
    textd1 = doc_response[textd1[1]]
    textd2 = doc_response[textd2[1]]

    # Upload image to project1
    # https://commons.wikimedia.org/wiki/File:Charles_Fran%C3%A7ois_Daubigny_-_The_Coming_Storm;_Early_Spring_-_Walters_37163.jpg
    imaged1 = (
        "https://upload.wikimedia.org/wikipedia/commons/f/f0/Charles_Fran%C3%A7ois_Daubigny_-_The_Coming_Storm%3B_Early_Spring_-_Walters_37163.jpg",
        "Charles_Fran%C3%A7ois_Daubigny_-_The_Coming_Storm%3B_Early_Spring_-_Walters_37163.jpg",
    )

    # https://commons.wikimedia.org/wiki/File:Amanecer_desde_la_cima_del_Everest_por_Carlos_Pauner.JPG
    imaged2 = (
        "https://upload.wikimedia.org/wikipedia/commons/6/68/Amanecer_desde_la_cima_del_Everest_por_Carlos_Pauner.JPG",
        "Amanecer_desde_la_cima_del_Everest_por_Carlos_Pauner.JPG",
    )
    image_response = api_document.create([imaged1, imaged2], alice, project1)
    imaged1 = image_response[imaged1[1]]
    imaged2 = image_response[imaged2[1]]

    # Upload video to project1
    # https://commons.wikimedia.org/wiki/File:Welche_Form_hat_das_Universum%3F.webm
    videod1 = (
        "https://upload.wikimedia.org/wikipedia/commons/1/18/Welche_Form_hat_das_Universum%3F.webm",
        "Welche_Form_hat_das_Universum%3F.webm",
    )

    # https://commons.wikimedia.org/wiki/File:Lurraren_ilargiak.webm
    videod2 = (
        "https://upload.wikimedia.org/wikipedia/commons/b/b7/Lurraren_ilargiak.webm",
        "Lurraren_ilargiak.webm",
    )

    video_response = api_document.create([videod1, videod2], alice, project1)
    videod1 = video_response[videod1[1]]
    videod2 = video_response[videod2[1]]

    # Upload audio to project1
    # https://commons.wikimedia.org/wiki/File:Audio_file_of_Retrato_de_Maria_Quit%C3%A9ria_de_Jesus_Medeiros.ogg
    audiod1 = (
        "https://upload.wikimedia.org/wikipedia/commons/4/4c/Audio_file_of_Retrato_de_Maria_Quit%C3%A9ria_de_Jesus_Medeiros.ogg",
        "Audio_file_of_Retrato_de_Maria_Quit%C3%A9ria_de_Jesus_Medeiros.ogg",
    )

    # https://commons.wikimedia.org/wiki/File:Nl-Zandvoort_(Gelderland)-article.ogg
    audiod2 = (
        "https://upload.wikimedia.org/wikipedia/commons/e/e1/Nl-Zandvoort_%28Gelderland%29-article.ogg",
        "Nl-Zandvoort_%28Gelderland%29-article.ogg",
    )

    audio_response = api_document.create([audiod1, audiod2], alice, project1)
    audiod1 = audio_response[audiod1[1]]
    audiod2 = audio_response[audiod2[1]]
