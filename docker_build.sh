#!/bin/bash


PS3="Which image? "
select image in backend celery_worker; do
  case $image in
    backend)
      break
      ;;
    celery_worker)
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

PS3="Which platform? "
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
echo "Jupyter: ${jupyter}"
echo "Platform: ${platform}"
echo "docker_tag: ${docker_tag}"
echo "push: ${push}"
echo "--------------"

read -p "Are you sure? " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if [ $image == backend ]; then
    docker build -f Dockerfile_backend --build-arg INSTALL_JUPYTER="${jupyter}" --build-arg TINI_BINARY="${tini}" -t uhhlt/dwts_backend:"${docker_tag}" .

    if [ $push == true ]; then
        docker login && docker push uhhlt/dwts_backend:"${docker_tag}"
    fi

  elif [ $image == celery_worker ]; then
    docker build -f Dockerfile_celery_worker --build-arg INSTALL_JUPYTER="${jupyter}" --build-arg TINI_BINARY="${tini}" -t uhhlt/dwts_backend_celery:"${docker_tag}" .

    if [ $push == true ]; then
        docker login && docker push uhhlt/dwts_backend:"${docker_tag}"
    fi
  fi
fi


