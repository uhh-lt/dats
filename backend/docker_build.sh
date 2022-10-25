#!/bin/bash

PS3="Which image(s)? "
select image in all_but_deps backend_deps backend_api celery_text_worker celery_image_worker celery_archive_worker celery_simsearch_worker; do
  case $image in
  all_but_deps)
    break
    ;;
  backend_deps)
    break
    ;;
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
  celery_simsearch_worker)
    break
    ;;
  *)
    echo "Invalid option $REPLY"
    ;;
  esac
  echo
done
echo

if [ $image == backend_deps ]; then
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
    debian)
      tini="tini"
      break
      ;;
    mac_m1)
      tini="tini-arm64"
      break
      ;;
    *)
      echo "Invalid option $REPLY"
      ;;
    esac
    echo
  done
  echo

fi

read -r -p "docker tag: " docker_tag
echo

PS3="Push after build? "
select push in true false; do
  case $push in
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
if [ $image == backend_deps ]; then
  echo "Build Jupyter: ${jupyter}"
  echo "Target Platform: ${platform}"
fi
echo "docker tag: ${docker_tag}"
echo "push after build: ${push}"
echo "--------------"

read -p "Are you sure (y/n) ? " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if [ $image == backend_deps ]; then
    docker build -f Dockerfile_backend_deps --build-arg INSTALL_JUPYTER="${jupyter}" --build-arg TINI_BINARY="${tini}" -t uhhlt/dwts_backend_deps:"${docker_tag}" .

    if [ $push == true ]; then
      docker login && docker push uhhlt/dwts_backend_deps:"${docker_tag}"
    fi
  elif [ $image == backend_api ]; then
    docker build -f Dockerfile_backend_api -t uhhlt/dwts_backend_api:"${docker_tag}" .

    if [ $push == true ]; then
      docker login && docker push uhhlt/dwts_backend_api:"${docker_tag}"
    fi
  elif [ $image == celery_text_worker ]; then
    docker build -f Dockerfile_celery_text_worker -t uhhlt/dwts_backend_celery_text:"${docker_tag}" .

    if [ $push == true ]; then
      docker login && docker push uhhlt/dwts_backend_celery_text:"${docker_tag}"
    fi
  elif [ $image == celery_image_worker ]; then
    docker build -f Dockerfile_celery_image_worker -t uhhlt/dwts_backend_celery_image:"${docker_tag}" .

    if [ $push == true ]; then
      docker login && docker push uhhlt/dwts_backend_celery_image:"${docker_tag}"
    fi
  elif [ $image == celery_archive_worker ]; then
    docker build -f Dockerfile_celery_archive_worker -t uhhlt/dwts_backend_celery_archive:"${docker_tag}" .

    if [ $push == true ]; then
      docker login && docker push uhhlt/dwts_backend_celery_archive:"${docker_tag}"
    fi
  elif [ $image == celery_simsearch_worker ]; then
    docker build -f Dockerfile_celery_simsearch_worker -t uhhlt/dwts_backend_celery_simsearch:"${docker_tag}" .

    if [ $push == true ]; then
      docker login && docker push uhhlt/dwts_backend_celery_simsearch:"${docker_tag}"
    fi
  elif [ $image == all_but_deps ]; then
    docker build -f Dockerfile_backend_api -t uhhlt/dwts_backend_api:"${docker_tag}" .
    docker build -f Dockerfile_celery_text_worker -t uhhlt/dwts_backend_celery_text:"${docker_tag}" .
    docker build -f Dockerfile_celery_image_worker -t uhhlt/dwts_backend_celery_image:"${docker_tag}" .
    docker build -f Dockerfile_celery_archive_worker -t uhhlt/dwts_backend_celery_archive:"${docker_tag}" .
    docker build -f Dockerfile_celery_simsearch_worker -t uhhlt/dwts_backend_celery_simsearch:"${docker_tag}" .

    if [ $push == true ]; then
      docker login && docker push uhhlt/dwts_backend_api:"${docker_tag}"
      docker login && docker push uhhlt/dwts_backend_celery_text:"${docker_tag}"
      docker login && docker push uhhlt/dwts_backend_celery_image:"${docker_tag}"
      docker login && docker push uhhlt/dwts_backend_celery_archive:"${docker_tag}"
      docker login && docker push uhhlt/dwts_backend_celery_simsearch:"${docker_tag}"
    fi
  fi
fi
