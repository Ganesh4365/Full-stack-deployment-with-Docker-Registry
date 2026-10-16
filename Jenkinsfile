
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
            description: 'Docker Hub repository'
        )

        string(
            name: 'CONTAINER_NAME',
            defaultValue: 'website-container',
            description: 'Docker container name'
        )

        string(
            name: 'HOST_PORT',
            defaultValue: '3000',
            description: 'Host port'
        )

        string(
            name: 'CONTAINER_PORT',
            defaultValue: '3000',
            description: 'Container port'
        )
    }

    environment {
        DOCKERHUB_REPO = "${params.DOCKERHUB_REPO}"
        CONTAINER_NAME = "${params.CONTAINER_NAME}"
        HOST_PORT = "${params.HOST_PORT}"
        CONTAINER_PORT = "${params.CONTAINER_PORT}"

        // Automatically generate a unique version per Jenkins build.
        IMAGE_TAG = "v${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm

                sh '''
                    set -eu
                    test -f Dockerfile
                    test -f package.json

                    echo "Git commit:"
                    git rev-parse --short HEAD

                    echo "Docker image:"
                    echo "${DOCKERHUB_REPO}:${IMAGE_TAG}"
                '''
            }
        }

        stage('Validate Parameters') {
            steps {
                sh '''
                    set -eu

                    test -n "$DOCKERHUB_REPO"
                    test -n "$CONTAINER_NAME"

                    echo "$DOCKERHUB_REPO" |
                        grep -Eq '^[a-z0-9]+([._-][a-z0-9]+)*/[a-z0-9]+([._-][a-z0-9]+)*$'

                    echo "$CONTAINER_NAME" |
                        grep -Eq '^[a-zA-Z0-9][a-zA-Z0-9_.-]*$'

                    for PORT in "$HOST_PORT" "$CONTAINER_PORT"; do
                        echo "$PORT" | grep -Eq '^[0-9]+$'
                        test "$PORT" -ge 1
                        test "$PORT" -le 65535
                    done

                    echo "Image tag: $IMAGE_TAG"
                    echo "Parameters validated successfully."
                '''
            }
        }

        stage('Build Image') {
            steps {
                sh '''
                    set -eu

                    docker build --pull \
                        --tag "${DOCKERHUB_REPO}:${IMAGE_TAG}" .
                '''
            }
        }

        stage('Verify Image') {
            steps {
                sh '''
                    set -eu

                    docker image inspect \
                        "${DOCKERHUB_REPO}:${IMAGE_TAG}" >/dev/null

                    echo "Image verified successfully."
                '''
            }
        }

        stage('Push Image to Docker Hub') {
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

                        docker push "${DOCKERHUB_REPO}:${IMAGE_TAG}"

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

                        docker pull "${DOCKERHUB_REPO}:${IMAGE_TAG}"

                        docker logout
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    set -eu

                    IMAGE="${DOCKERHUB_REPO}:${IMAGE_TAG}"
                    NAME="$CONTAINER_NAME"
                    PORT="$HOST_PORT"
                    TARGET_PORT="$CONTAINER_PORT"

                    # Capture the existing image before replacing the container.
                    OLD_IMAGE=$(docker inspect \
                        --format '{{.Config.Image}}' "$NAME" 2>/dev/null || true)

                    echo "Deploying: $IMAGE"

                    # Replace the existing application container.
                    docker rm -f "$NAME" 2>/dev/null || true

                    docker run -d \
                        --name "$NAME" \
                        --restart unless-stopped \
                        -p "${PORT}:${TARGET_PORT}" \
                        "$IMAGE"

                    HEALTHY=false

                    # Wait for the application to respond over HTTP.
                    for ATTEMPT in $(seq 1 30); do
                        RUNNING=$(docker inspect \
                            --format '{{.State.Running}}' "$NAME" \
                            2>/dev/null || true)

                        if [ "$RUNNING" != "true" ]; then
                            echo "New container stopped unexpectedly."
                            break
                        fi

                        if curl --fail --silent \
                            --max-time 3 \
                            "http://127.0.0.1:${PORT}/" >/dev/null; then
                            HEALTHY=true
                            break
                        fi

                        echo "Waiting for application health check: $ATTEMPT/30"
                        sleep 2
                    done

                    if [ "$HEALTHY" != "true" ]; then
                        echo "Deployment health check failed."
                        docker logs "$NAME" || true

                        docker rm -f "$NAME" 2>/dev/null || true

                        # Best-effort rollback to the previously running image.
                        if [ -n "$OLD_IMAGE" ]; then
                            echo "Rolling back to: $OLD_IMAGE"

                            docker run -d \
                                --name "$NAME" \
                                --restart unless-stopped \
                                -p "${PORT}:${TARGET_PORT}" \
                                "$OLD_IMAGE" || true
                        fi

                        exit 1
                    fi

                    echo "Deployment and HTTP health check succeeded."

                    docker ps --filter "name=^/${NAME}$"
                '''
            }
        }
    }

    post {
        success {
            echo "Deployment successful. Image: ${DOCKERHUB_REPO}:${IMAGE_TAG}"
        }

        failure {
            echo "Pipeline failed. Check the failed stage and console logs."
        }

        always {
            echo "Jenkins build #${BUILD_NUMBER} completed."
        }
    }
}
