
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
            description: 'Unique image tag for this release'
        )
        string(
            name: 'CONTAINER_NAME',
            defaultValue: 'website-container',
            description: 'Container name'
        )
        string(
            name: 'HOST_PORT',
            defaultValue: '3000',
            description: 'Ubuntu host port'
        )
        string(
            name: 'CONTAINER_PORT',
            defaultValue: '3000',
            description: 'Application port inside the container'
        )
    }

    environment {
        DOCKERHUB_REPO = "${params.DOCKERHUB_REPO}"
        RELEASE_VERSION = "${params.RELEASE_VERSION}"
        CONTAINER_NAME = "${params.CONTAINER_NAME}"
        HOST_PORT = "${params.HOST_PORT}"
        CONTAINER_PORT = "${params.CONTAINER_PORT}"
        IMAGE_TAG = "v${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm

                sh '''
                    set -eu
                    echo "Commit: $(git rev-parse --short HEAD)"
                    test -f Dockerfile
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

                    case "$DOCKERHUB_REPO" in
                        */*) ;;
                        *) echo "Repository must be username/repository"; exit 1 ;;
                    esac

                    case "$RELEASE_VERSION" in
                        *[!a-zA-Z0-9_.-]*|'')
                            echo "Invalid image tag"
                            exit 1
                            ;;
                    esac

                    case "$CONTAINER_NAME" in
                        *[!a-zA-Z0-9_.-]*|'')
                            echo "Invalid container name"
                            exit 1
                            ;;
                    esac

                    for PORT_VALUE in "$HOST_PORT" "$CONTAINER_PORT"; do
                        case "$PORT_VALUE" in
                            *[!0-9]*|'')
                                echo "Ports must be numeric"
                                exit 1
                                ;;
                        esac

                        [ "$PORT_VALUE" -ge 1 ] &&
                        [ "$PORT_VALUE" -le 65535 ] || {
                            echo "Ports must be between 1 and 65535"
                            exit 1
                        }
                    done

                    echo "Repository: $DOCKERHUB_REPO"
                    echo "Version: $RELEASE_VERSION"
                    echo "Container: $CONTAINER_NAME"
                    echo "Port mapping: $HOST_PORT:$CONTAINER_PORT"
                '''
            }
        }

        stage('Build Image') {
            steps {
                sh '''
                    set -eu
                    IMAGE="${DOCKERHUB_REPO}:${RELEASE_VERSION}"

                    docker build --pull --tag "$IMAGE" .
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

                    echo "Docker image verified."
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

                    docker image inspect "$IMAGE" >/dev/null

                    # Record the previous container image for rollback.
                    OLD_IMAGE=$(docker inspect \
                        --format '{{.Config.Image}}' "$NAME" \
                        2>/dev/null || true)

                    # Remove the previous container, as in the manual steps.
                    docker rm -f "$NAME" 2>/dev/null || true

                    # Start the newly published image.
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

                    # Wait for startup and check both container state and HTTP.
                    HEALTHY=false

                    for ATTEMPT in $(seq 1 30); do
                        if ! docker inspect \
                            --format '{{.State.Running}}' "$NAME" \
                            2>/dev/null | grep -qx true; then

                            echo "Container stopped during startup."
                            break
                        fi

                        if curl --fail --silent \
                            --max-time 3 \
                            "http://127.0.0.1:${PORT}/" >/dev/null; then

                            HEALTHY=true
                            break
                        fi

                        echo "Waiting for HTTP response: attempt ${ATTEMPT}/30"
                        sleep 2
                    done

                    if [ "$HEALTHY" != "true" ]; then
                        echo "Deployment health check failed."
                        docker logs "$NAME" || true
                        docker rm -f "$NAME" 2>/dev/null || true

                        if [ -n "$OLD_IMAGE" ]; then
                            echo "Rolling back to $OLD_IMAGE"

                            docker run -d \
                                --name "$NAME" \
                                --restart unless-stopped \
                                -p "${PORT}:${TARGET_PORT}" \
                                "$OLD_IMAGE"

                            echo "Previous image restarted."
                        else
                            echo "No previous image is available for rollback."
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
            echo 'SUCCESS: Build, push, pull, deployment and HTTP check completed.'
        }

        failure {
            echo 'FAILURE: Review the first failed stage and its logs.'
        }

        always {
            echo 'Pipeline execution finished.'
        }
    }
}
