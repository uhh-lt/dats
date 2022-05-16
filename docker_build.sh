#!/bin/bash

PS3="Which image? "
select image in backend_api celery_text_worker celery_image_worker celery_archive_worker; do
  case $image in
  backend_api)
    break
    ;;
  celery_text_worker)
    break
    ;;
  celery_image_worker)
    break
    ;;
  celery_archive_worker)
    break
    ;;
  *)
    echo "Invalid option $REPLY"
    ;;
  esac
  echo
done
echo

PS3="Install Jupyter (for dev)? "
select jupyter in true false; do
  case $jupyter in
  true)
    break
    ;;
  false)
    break
    ;;
  *)
    echo "Invalid option $REPLY"
    ;;
  esac
  echo
done
echo

PS3="Which is the target platform? "
select platform in mac_m1 debian; do
  case $platform in
  mac_m1)
    tini="tini-arm64"
    break
    ;;
  debian)
    tini="tini"
    break
    ;;
  *)
    echo "Invalid option $REPLY"
    ;;
  esac
  echo
done
echo

read -r -p "docker tag: " docker_tag
echo

PS3="Push after build? "
select push in true false; do
  case $jupyter in
  true)
    break
    ;;
  false)
    break
    ;;
  *)
    echo "Invalid option $REPLY"
    ;;
  esac
  echo
done
echo

echo "Starting build with the following settings: "
echo "--------------"
echo "Image: ${image}"
echo "Build Jupyter: ${jupyter}"
echo "Target Platform: ${platform}"
echo "docker_tag: ${docker_tag}"
echo "push after build: ${push}"
echo "--------------"

read -p "Are you sure (y/n) ? " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if [ $image == backend_api ]; then
    docker build -f Dockerfile_backend_api --build-arg INSTALL_JUPYTER="${jupyter}" --build-arg TINI_BINARY="${tini}" -t uhhlt/dwts_backend_api:"${docker_tag}" .

    if [ $push == true ]; then
      docker login && docker push uhhlt/dwts_backend_api:"${docker_tag}"
    fi
  elif [ $image == celery_text_worker ]; then
    docker build -f Dockerfile_celery_text_worker --build-arg INSTALL_JUPYTER="${jupyter}" --build-arg TINI_BINARY="${tini}" -t uhhlt/dwts_backend_celery_text:"${docker_tag}" .

    if [ $push == true ]; then
      docker login && docker push uhhlt/dwts_backend_celery_text:"${docker_tag}"
    fi
  elif [ $image == celery_image_worker ]; then
    docker build -f Dockerfile_celery_image_worker --build-arg INSTALL_JUPYTER="${jupyter}" --build-arg TINI_BINARY="${tini}" -t uhhlt/dwts_backend_celery_image:"${docker_tag}" .

    if [ $push == true ]; then
      docker login && docker push uhhlt/dwts_backend_celery_image:"${docker_tag}"
    fi
  elif [ $image == celery_archive_worker ]; then
    docker build -f Dockerfile_celery_archive_worker --build-arg INSTALL_JUPYTER="${jupyter}" --build-arg TINI_BINARY="${tini}" -t uhhlt/dwts_backend_celery_archive:"${docker_tag}" .

    if [ $push == true ]; then
      docker login && docker push uhhlt/dwts_backend_celery_image:"${docker_tag}"
    fi
  fi
fi
