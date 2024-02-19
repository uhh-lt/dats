import pytest
from fastapi.testclient import TestClient


def test_project_add_user(client: TestClient, api_user, api_project) -> None:
    alice = api_user.create("alice")
    bob = api_user.create("bob")
    # charlie = api_user.create("charlie")

    project1 = api_project.create(alice, "project1")
    project2 = api_project.create(bob, "project2")

    # Add Bob to project1
    response_add_p1_bob = client.patch(
        f"/project/{project1['id']}/user/{bob['id']}", headers=alice["AuthHeader"]
    )
    assert response_add_p1_bob.status_code == 200

    # Alice changes project2 - failure
    change_p2_failure = {"title": "this", "description": "shouldn't work"}
    response_update_p2_alice_failure = client.patch(
        f"/project/{project2['id']}",
        headers=alice["AuthHeader"],
        json=change_p2_failure,
    )
    assert response_update_p2_alice_failure.status_code == 403


@pytest.mark.order(after="test_project_add_user")
def test_project_update(client: TestClient, api_user, api_project) -> None:
    alice = api_user.userList["alice"]
    bob = api_user.userList["bob"]
    project1 = api_project.projectList["project1"]
    project2 = api_project.projectList["project2"]

    change_p2 = {"title": "this", "description": "should work"}
    # Add Alice to project2
    response_add_p2_alice = client.patch(
        f"/project/{project2['id']}/user/{alice['id']}", headers=bob["AuthHeader"]
    )
    assert response_add_p2_alice.status_code == 200

    # Alice changes project2
    response_update_p2_alice_success = client.patch(
        f"/project/{project2['id']}", headers=alice["AuthHeader"], json=change_p2
    )
    assert response_update_p2_alice_success.status_code == 200

    # Change title and description of project1
    change_p1 = {"title": "its weird", "description": "innit?"}
    response_update_p1 = client.patch(
        f"/project/{project1['id']}", headers=alice["AuthHeader"], json=change_p1
    )
    response_update_p1.status_code == 200

    # Change title and description of project2
    change_p2 = {"title": "You know the rules", "description": "and so do I"}
    response_update_p2 = client.patch(
        f"/project/{project2['id']}", headers=bob["AuthHeader"], json=change_p2
    )
    response_update_p2.status_code == 200


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
        f"/user/{charlie['id']}", headers=charlie["AuthHeader"], json=update_charlie
    )
    assert response_update_charlie.status_code == 200

    # Remove Charlie - failure (changed email)
    response_remove_charlie_failure = client.delete(
        f"/user/{charlie['id']}", headers=charlie["AuthHeader"]
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
        "Authorization": f"{response_relogin_charlie['token_type']} {response_relogin_charlie['access_token']}"
    }

    # Remove Charlie
    response_remove_charlie = client.delete(
        f"/user/{charlie['id']}", headers=AuthHeader_charlie
    )
    assert response_remove_charlie.status_code == 200


@pytest.mark.order(after="test_project_add_user")
def test_codes_create(client: TestClient, api_user, api_project, api_code) -> None:
    project1 = api_project.projectList["project1"]
    project2 = api_project.projectList["project2"]

    alice = api_user.userList["alice"]
    bob = api_user.userList["bob"]

    # Create codes in project1
    response_codes_project1_before = client.get(
        f"/project/{project1['id']}/code", headers=alice["AuthHeader"]
    ).json()
    codes_project1_before = len(response_codes_project1_before)

    _ = api_code.create("code1", alice, project1)
    _ = api_code.create("code2", alice, project1)
    _ = api_code.create("code3", alice, project1)

    response_codes_project1_after = client.get(
        f"/project/{project1['id']}/code", headers=alice["AuthHeader"]
    ).json()
    codes_project1_after = len(response_codes_project1_after)

    assert codes_project1_before + 3 == codes_project1_after

    # Create codes in project2
    response_codes_project2_before = client.get(
        f"/project/{project2['id']}/code", headers=bob["AuthHeader"]
    ).json()
    codes_project2_before = len(response_codes_project2_before)
    _ = api_code.create("code4", bob, project2)
    _ = api_code.create("code5", bob, project2)
    _ = api_code.create("code6", bob, project2)

    response_codes_project2_after = client.get(
        f"/project/{project2['id']}/code", headers=alice["AuthHeader"]
    ).json()
    codes_project2_after = len(response_codes_project2_after)

    assert codes_project2_before + 3 == codes_project2_after


@pytest.mark.order(after="test_project_add_user")
def test_upload_documents(client, api_user, api_project, api_document):
    # TODO Refactor spagetti code
    # TODO Implement helpermethod to store sdoc_id after successful upload
    import time

    alice = api_user.userList["alice"]
    project1 = api_project.projectList["project1"]

    # Upload text to project1
    # https://de.wikipedia.org/wiki/Erde
    text_doc1 = ("https://de.wikipedia.org/wiki/Erde", "Erde – Wikipedia.html")
    # https://de.wikipedia.org/wiki/Ferae
    text_doc2 = ("https://de.wikipedia.org/wiki/Ferae", "Ferae – Wikipedia.html")
    text_response12 = api_document.create([text_doc1, text_doc2], alice, project1)

    text1_prepro_job_id = text_response12[text_doc1[1]]["prepro_job_id"]
    text2_prepro_job_id = text_response12[text_doc2[1]]["prepro_job_id"]

    text1_prepro_status = api_document.prepro_status(text1_prepro_job_id, alice)
    text2_prepro_status = api_document.prepro_status(text2_prepro_job_id, alice)
    while text1_prepro_status == "Running" or text2_prepro_status == "Running":
        text1_prepro_status = api_document.prepro_status(text1_prepro_job_id, alice)
        text2_prepro_status = api_document.prepro_status(text2_prepro_job_id, alice)
        time.sleep(2)
    assert text1_prepro_status == "Finished"
    assert text2_prepro_status == "Finished"

    api_document.documentList["Erde – Wikipedia.html"]["sdoc_id"] = client.get(
        f"project/{project1['id']}/resolve_filename/{text_doc1[1]}",
        headers=alice["AuthHeader"],
    ).json()
    api_document.documentList["Ferae – Wikipedia.html"]["sdoc_id"] = client.get(
        f"project/{project1['id']}/resolve_filename/{text_doc2[1]}",
        headers=alice["AuthHeader"],
    ).json()

    # Upload image to project1
    # https://commons.wikimedia.org/wiki/File:Charles_Fran%C3%A7ois_Daubigny_-_The_Coming_Storm;_Early_Spring_-_Walters_37163.jpg
    image_doc1 = (
        "https://upload.wikimedia.org/wikipedia/commons/f/f0/Charles_Fran%C3%A7ois_Daubigny_-_The_Coming_Storm%3B_Early_Spring_-_Walters_37163.jpg",
        "Charles_Fran%C3%A7ois_Daubigny_-_The_Coming_Storm%3B_Early_Spring_-_Walters_37163.jpg",
    )
    # https://commons.wikimedia.org/wiki/File:Amanecer_desde_la_cima_del_Everest_por_Carlos_Pauner.JPG
    image_doc2 = (
        "https://upload.wikimedia.org/wikipedia/commons/6/68/Amanecer_desde_la_cima_del_Everest_por_Carlos_Pauner.JPG",
        "Amanecer_desde_la_cima_del_Everest_por_Carlos_Pauner.JPG",
    )

    image_response12 = api_document.create([image_doc1, image_doc2], alice, project1)
    image1_prepro_job_id = image_response12[image_doc1[1]]["prepro_job_id"]
    image2_prepro_job_id = image_response12[image_doc2[1]]["prepro_job_id"]

    image1_prepro_status = api_document.prepro_status(image1_prepro_job_id, alice)
    image2_prepro_status = api_document.prepro_status(image2_prepro_job_id, alice)
    while image1_prepro_status == "Running" or image2_prepro_status == "Running":
        image1_prepro_status = api_document.prepro_status(image1_prepro_job_id, alice)
        image2_prepro_status = api_document.prepro_status(image2_prepro_job_id, alice)
        time.sleep(2)
    assert image1_prepro_status == "Finished"
    assert image2_prepro_status == "Finished"

    # Upload video to project1
    # https://commons.wikimedia.org/wiki/File:Welche_Form_hat_das_Universum%3F.webm
    video_doc1 = (
        "https://upload.wikimedia.org/wikipedia/commons/1/18/Welche_Form_hat_das_Universum%3F.webm",
        "Welche_Form_hat_das_Universum%3F.webm",
    )

    # https://commons.wikimedia.org/wiki/File:Lurraren_ilargiak.webm
    video_doc2 = (
        "https://upload.wikimedia.org/wikipedia/commons/b/b7/Lurraren_ilargiak.webm",
        "Lurraren_ilargiak.webm",
    )

    video_response12 = api_document.create([video_doc1, video_doc2], alice, project1)
    video1_prepro_job_id = video_response12[video_doc1[1]]["prepro_job_id"]
    video2_prepro_job_id = video_response12[video_doc2[1]]["prepro_job_id"]

    video1_propro_status = api_document.prepro_status(video1_prepro_job_id, alice)
    video2_prepro_status = api_document.prepro_status(video2_prepro_job_id, alice)
    while video1_propro_status == "Running" or video2_prepro_status == "Running":
        video1_propro_status = api_document.prepro_status(video1_prepro_job_id, alice)
        video2_prepro_status = api_document.prepro_status(video2_prepro_job_id, alice)
        time.sleep(1)
    assert video1_propro_status == "Finished"
    assert video2_prepro_status == "Finished"

    # Upload audio to project1
    # https://commons.wikimedia.org/wiki/File:Audio_file_of_Retrato_de_Maria_Quit%C3%A9ria_de_Jesus_Medeiros.ogg
    audio_doc1 = (
        "https://upload.wikimedia.org/wikipedia/commons/4/4c/Audio_file_of_Retrato_de_Maria_Quit%C3%A9ria_de_Jesus_Medeiros.ogg",
        "Audio_file_of_Retrato_de_Maria_Quit%C3%A9ria_de_Jesus_Medeiros.ogg",
    )

    # https://commons.wikimedia.org/wiki/File:Nl-Zandvoort_(Gelderland)-article.ogg
    audio_doc2 = (
        "https://upload.wikimedia.org/wikipedia/commons/e/e1/Nl-Zandvoort_%28Gelderland%29-article.ogg",
        "Nl-Zandvoort_%28Gelderland%29-article.ogg",
    )

    audio_response12 = api_document.create([audio_doc1, audio_doc2], alice, project1)
    audio1_prepro_job_id = audio_response12[audio_doc1[1]]["prepro_job_id"]
    audio2_prepro_job_id = audio_response12[audio_doc2[1]]["prepro_job_id"]

    audio1_prepro_status = api_document.prepro_status(audio1_prepro_job_id, alice)
    audio2_prepro_status = api_document.prepro_status(audio2_prepro_job_id, alice)
    while audio1_prepro_status == "Running" or audio2_prepro_status == "Running":
        audio1_prepro_status = api_document.prepro_status(audio1_prepro_job_id, alice)
        audio2_prepro_status = api_document.prepro_status(audio2_prepro_job_id, alice)
        time.sleep(2)
    assert audio1_prepro_status == "Finished"
    assert audio2_prepro_status == "Finished"

    bob = api_user.userList["bob"]
    project2 = api_project.projectList["project2"]

    # Upload text to project2
    # https://de.wikipedia.org/wiki/Mars_(Planet)
    text_doc3 = (
        "https://de.wikipedia.org/wiki/Mars_(Planet)",
        "Mars (Planet) – Wikipedia.html",
    )
    # https://de.wikipedia.org/wiki/Otter
    text_doc4 = ("https://de.wikipedia.org/wiki/Otter", "Otter – Wikipedia.html")
    text_response34 = api_document.create([text_doc3, text_doc4], bob, project2)

    text3_prepro_job_id = text_response34[text_doc3[1]]["prepro_job_id"]
    text4_prepro_job_id = text_response34[text_doc4[1]]["prepro_job_id"]

    text3_prepro_status = api_document.prepro_status(text3_prepro_job_id, bob)
    text4_prepro_status = api_document.prepro_status(text4_prepro_job_id, bob)
    while text3_prepro_status == "Running" or text4_prepro_status == "Running":
        text3_prepro_status = api_document.prepro_status(text3_prepro_job_id, bob)
        text4_prepro_status = api_document.prepro_status(text4_prepro_job_id, bob)
        time.sleep(2)
    assert text3_prepro_status == "Finished"
    assert text4_prepro_status == "Finished"

    # Upload image to project2
    # https://upload.wikimedia.org/wikipedia/commons/4/41/Space_Shuttle_Columbia_launching.jpg
    image_doc3 = (
        "https://upload.wikimedia.org/wikipedia/commons/4/41/Space_Shuttle_Columbia_launching.jpg",
        "Space_Shuttle_Columbia_launching.jpg",
    )
    # https://upload.wikimedia.org/wikipedia/commons/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg
    image_doc4 = (
        "https://upload.wikimedia.org/wikipedia/commons/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
        "Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
    )

    image_response34 = api_document.create([image_doc3, image_doc4], bob, project2)
    image3_prepro_job_id = image_response34[image_doc3[1]]["prepro_job_id"]
    image4_prepro_job_id = image_response34[image_doc4[1]]["prepro_job_id"]

    image3_prepro_status = api_document.prepro_status(image3_prepro_job_id, bob)
    image4_prepro_status = api_document.prepro_status(image4_prepro_job_id, bob)
    while image3_prepro_status == "Running" or image4_prepro_status == "Running":
        image3_prepro_status = api_document.prepro_status(image3_prepro_job_id, bob)
        image4_prepro_status = api_document.prepro_status(image4_prepro_job_id, bob)
        time.sleep(2)
    assert image3_prepro_status == "Finished"
    assert image4_prepro_status == "Finished"

    # Upload video to project2
    # https://upload.wikimedia.org/wikipedia/commons/6/64/2012-07-18_Market_Street_-_San_Francisco.webm
    video_doc3 = (
        "https://upload.wikimedia.org/wikipedia/commons/6/64/2012-07-18_Market_Street_-_San_Francisco.webm",
        "2012-07-18_Market_Street_-_San_Francisco.webm",
    )

    # https://upload.wikimedia.org/wikipedia/commons/8/87/Schlossbergbahn.webm
    video_doc4 = (
        "https://upload.wikimedia.org/wikipedia/commons/8/87/Schlossbergbahn.webm",
        "Schlossbergbahn.webm",
    )

    video_response34 = api_document.create([video_doc3, video_doc4], bob, project2)
    video3_prepro_job_id = video_response34[video_doc3[1]]["prepro_job_id"]
    video4_prepro_job_id = video_response34[video_doc4[1]]["prepro_job_id"]

    video3_prepro_status = api_document.prepro_status(video3_prepro_job_id, bob)
    video4_prepro_status = api_document.prepro_status(video4_prepro_job_id, bob)
    while video3_prepro_status == "Running" or video4_prepro_status == "Running":
        video3_prepro_status = api_document.prepro_status(video3_prepro_job_id, bob)
        video4_prepro_status = api_document.prepro_status(video4_prepro_job_id, bob)
        time.sleep(1)
    assert video3_prepro_status == "Finished"
    assert video4_prepro_status == "Finished"

    # Upload audio to project2
    # https://librivox.org/coffee-break-collection-25-water-by-various/
    audio_doc3 = (
        "https://ia903105.us.archive.org/34/items/cb025_1911_librivox/cb25_09_various_128kb.mp3",
        "cb25_09_various_128kb.mp3",
    )

    # https://ia803203.us.archive.org/0/items/sammlung_gedicht_012_librivox/deutschegedichte012_08_thule_lis.mp3
    audio_doc4 = (
        "https://ia803203.us.archive.org/0/items/sammlung_gedicht_012_librivox/deutschegedichte012_08_thule_lis.mp3",
        "deutschegedichte012_08_thule_lis.mp3",
    )

    audio_response34 = api_document.create([audio_doc3, audio_doc4], bob, project2)
    audio3_prepro_job_id = audio_response34[audio_doc3[1]]["prepro_job_id"]
    audio4_prepro_job_id = audio_response34[audio_doc4[1]]["prepro_job_id"]

    audio3_prepro_status = api_document.prepro_status(audio3_prepro_job_id, bob)
    audio4_prepro_status = api_document.prepro_status(audio4_prepro_job_id, bob)
    while audio3_prepro_status == "Running" or audio4_prepro_status == "Running":
        audio3_prepro_status = api_document.prepro_status(audio3_prepro_job_id, bob)
        audio4_prepro_status = api_document.prepro_status(audio4_prepro_job_id, bob)
        time.sleep(2)
    assert audio3_prepro_status == "Finished"
    assert audio4_prepro_status == "Finished"


@pytest.mark.order(after="test_project_add_user")
def test_project_memos(client, api_user, api_project):
    alice = api_user.userList["alice"]
    project1 = api_project.projectList["project1"]
    project_memo = {
        "title": "This is a memo",
        "content": "containing informations",
        "user_id": alice["id"],
        "project_id": project1["id"],
        "starred": True,
    }
    memo_response = client.put(
        f"project/{project1['id']}/memo", headers=alice["AuthHeader"], json=project_memo
    )
    assert memo_response.status_code == 200


@pytest.mark.order(after="test_upload_documents")
def test_annotate_sdoc(client, api_user, api_document):
    alice = api_user.userList["alice"]
    text_doc = api_document.documentList["Erde – Wikipedia.html"]
    # FIXME sdocID helpermethod missing. This is not ideal!
    response_sdoc_id = client.get(
        f"project/{text_doc['project_id']}/sdoc?only_finished=true&skip=0&limit=420",
        headers=alice["AuthHeader"],
    ).json()
    text_doc["sdoc_id"] = response_sdoc_id["sdocs"][0]["id"]
    adoc_create = {"source_document_id": text_doc["sdoc_id"], "user_id": alice["id"]}
    adoc_response = client.put(
        "adoc", headers=alice["AuthHeader"], json=adoc_create
    ).json()
    # Create SpanAnnotation
    span1_annotation = {
        "begin": 0,
        "end": 20,
        "begin_token": 0,
        "end_token": 4,
        "span_text": "test",
        "code_id": 5,
        "annotation_document_id": adoc_response["id"],
    }
    span1_response = client.put(
        "span", headers=alice["AuthHeader"], json=span1_annotation
    )
    assert span1_response.status_code == 200

    span2_annotation = {
        "begin": 5,
        "end": 25,
        "begin_token": 5,
        "end_token": 10,
        "span_text": "new test",
        "code_id": 6,
        "annotation_document_id": adoc_response["id"],
    }
    span2_response = client.put(
        "span", headers=alice["AuthHeader"], json=span2_annotation
    )
    assert span2_response.status_code == 200


@pytest.mark.order(after="test_upload_documents")
def test_bbox_annotatation(client, api_user, api_document):
    # alice = api_user.userList["alice"]
    # file = api_document.documentList["Erde – Wikipedia.html"]
    # project_id = file["project_id"]
    # filename = file["filename"]
    # TODO Helpermethod for sdoc_id missing
    # sdoc_id = client.get(
    #     f"project/{project_id}/resolve_filename/{filename}", headers=alice["AuthHeader"]
    # ).json()
    pass
