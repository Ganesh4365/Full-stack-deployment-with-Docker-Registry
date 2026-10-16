
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    parameters {
        string(
            name: 'DOCKERHUB_REPO',
            defaultValue: 'ganeshsuryawanshi12345/website',
            description: 'Docker Hub repository: username/repository'
        )
        string(
            name: 'RELEASE_VERSION',
            defaultValue: 'v1.0.0',
            description: 'Unique release tag, e.g. v1.0.1'
        )
        string(
            name: 'CONTAINER_NAME',
            defaultValue: 'website-container',
            description: 'Name of the deployed container'
        )
        string(
            name: 'HOST_PORT',
            defaultValue: '3000',
            description: 'Ubuntu host port'
        )
        string(
            name: 'CONTAINER_PORT',
            defaultValue: '3000',
            description: 'Port exposed by the website container'
        )
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm

                sh '''
                    set -eu
                    echo "Commit: $(git rev-parse --short HEAD)"
                    test -f Dockerfile
                    test -f Jenkinsfile
                '''
            }
        }

        stage('Build Image') {
            steps {
                sh '''
                    set -eu

                    IMAGE="${DOCKERHUB_REPO}:${RELEASE_VERSION}"

                    docker build \
                      --pull \
                      --tag "$IMAGE" .
                '''
            }
        }

        stage('Verify Image') {
            steps {
                sh '''
                    set -eu
                    docker image inspect \
                      "${DOCKERHUB_REPO}:${RELEASE_VERSION}"
                '''
            }
        }

        stage('Push Image') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'REGISTRY_USER',
                        passwordVariable: 'REGISTRY_TOKEN'
                    )
                ]) {
                    sh '''
                        set -eu
                        set +x

                        echo "$REGISTRY_TOKEN" |
                          docker login \
                            --username "$REGISTRY_USER" \
                            --password-stdin

                        docker push \
                          "${DOCKERHUB_REPO}:${RELEASE_VERSION}"

                        docker logout
                    '''
                }
            }
        }

        stage('Pull Published Image') {
            steps {
                sh '''
                    set -eu

                    docker pull \
                      "${DOCKERHUB_REPO}:${RELEASE_VERSION}"
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    set -eu

                    IMAGE="${DOCKERHUB_REPO}:${RELEASE_VERSION}"
                    NAME="$CONTAINER_NAME"
                    PORT="$HOST_PORT"
                    TARGET_PORT="$CONTAINER_PORT"

                    # Save the old image reference for rollback.
                    OLD_IMAGE=$(docker inspect \
                      --format '{{.Config.Image}}' "$NAME" 2>/dev/null || true)

                    # Validate the new image before replacing the old container.
                    docker image inspect "$IMAGE" >/dev/null

                    # Remove the previous container only after the new image
                    # has been built, pushed, and pulled successfully.
                    docker rm -f "$NAME" 2>/dev/null || true

                    # Start the new release.
                    if ! docker run -d \
                        --name "$NAME" \
                        --restart unless-stopped \
                        -p "${PORT}:${TARGET_PORT}" \
                        "$IMAGE"; then

                        echo "New container failed to start."

                        if [ -n "$OLD_IMAGE" ]; then
                            docker run -d \
                              --name "$NAME" \
                              --restart unless-stopped \
                              -p "${PORT}:${TARGET_PORT}" \
                              "$OLD_IMAGE"
                        fi

                        exit 1
                    fi

                    # Check that the website responds over HTTP.
                    if ! curl --fail --silent --show-error \
                        --retry 10 --retry-delay 2 --retry-connrefused \
                        "http://127.0.0.1:${PORT}/" >/dev/null; then

                        echo "HTTP verification failed. Rolling back."

                        docker rm -f "$NAME" 2>/dev/null || true

                        if [ -n "$OLD_IMAGE" ]; then
                            docker run -d \
                              --name "$NAME" \
                              --restart unless-stopped \
                              -p "${PORT}:${TARGET_PORT}" \
                              "$OLD_IMAGE"

                            echo "Previous image restarted."
                        else
                            echo "No previous container image was recorded."
                        fi

                        exit 1
                    fi

                    echo "Deployment and HTTP verification succeeded."
                    docker ps --filter "name=^/${NAME}$"
                '''
            }
        }
    }

    post {
        success {
            echo 'Build, registry push, pull, and deployment succeeded.'
        }
        failure {
            echo 'Pipeline failed. Inspect Console Output to identify the failed stage.'
        }
    }
}
