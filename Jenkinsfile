
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
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

    environment {
        DOCKERHUB_REPO = "${params.DOCKERHUB_REPO}"
        RELEASE_VERSION = "${params.RELEASE_VERSION}"
        CONTAINER_NAME = "${params.CONTAINER_NAME}"
        HOST_PORT = "${params.HOST_PORT}"
        CONTAINER_PORT = "${params.CONTAINER_PORT}"
    }

    stages {
        stage('Checkout') {
            steps {
                // Perform one checkout only.
                checkout scm

                sh '''
                    set -eu
                    echo "Commit: $(git rev-parse --short HEAD)"
                    test -f Dockerfile
                    test -f Jenkinsfile
                    test -f package.json
                '''
            }
        }

        stage('Validate Parameters') {
            steps {
                sh '''
                    set -eu

                    test -n "$DOCKERHUB_REPO"
                    test -n "$RELEASE_VERSION"
                    test -n "$CONTAINER_NAME"

                    case "$HOST_PORT" in
                        *[!0-9]*|'') echo "Invalid HOST_PORT"; exit 1 ;;
                    esac

                    case "$CONTAINER_PORT" in
                        *[!0-9]*|'') echo "Invalid CONTAINER_PORT"; exit 1 ;;
                    esac

                    [ "$HOST_PORT" -ge 1 ] &&
                    [ "$HOST_PORT" -le 65535 ] || {
                        echo "HOST_PORT must be between 1 and 65535"
                        exit 1
                    }

                    [ "$CONTAINER_PORT" -ge 1 ] &&
                    [ "$CONTAINER_PORT" -le 65535 ] || {
                        echo "CONTAINER_PORT must be between 1 and 65535"
                        exit 1
                    }

                    echo "Repository: $DOCKERHUB_REPO"
                    echo "Version: $RELEASE_VERSION"
                    echo "Container: $CONTAINER_NAME"
                    echo "Host port: $HOST_PORT"
                    echo "Container port: $CONTAINER_PORT"
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
                        "${DOCKERHUB_REPO}:${RELEASE_VERSION}" \
                        >/dev/null

                    echo "Image verification succeeded."
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
                    '''
                }
            }
        }

        stage('Pull Published Image') {
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

                        docker pull \
                            "${DOCKERHUB_REPO}:${RELEASE_VERSION}"

                        docker logout
                    '''
                }
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

                    # Confirm the published image exists locally.
                    docker image inspect "$IMAGE" >/dev/null

                    # Record the existing container's image for rollback.
                    OLD_IMAGE=$(docker inspect \
                        --format '{{.Config.Image}}' "$NAME" \
                        2>/dev/null || true)

                    # Remove the previous container only after the image
                    # has built, pushed, and pulled successfully.
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
                            echo "Previous image restarted."
                        fi

                        exit 1
                    fi

                    # Verify the application responds over HTTP.
                    if ! curl --fail --silent --show-error \
                        --retry 10 \
                        --retry-delay 2 \
                        --retry-connrefused \
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
                            echo "No previous image available for rollback."
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
            echo 'SUCCESS: Image built, verified, pushed, pulled, and deployed.'
        }

        failure {
            echo 'FAILURE: Check Console Output for the first failed stage.'
        }

        always {
            echo 'Pipeline execution finished.'
        }
    }
}
