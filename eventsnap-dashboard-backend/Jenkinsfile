pipeline {
    agent any

    // Ensure Node.js is configured in Jenkins Global Tool Configuration
    tools {
        nodejs 'node-20' // This name must match your Jenkins Tool name
    }

    environment {
        IMAGE_NAME = "eventsnap-svc"
        CONTAINER_NAME = "eventsnap-svc-container"
        HOST_PORT = "4000"
        APP_PORT = "3000"
    }

    stages {
        // Stage 1: Install dependencies and Build
        stage('Install & Build') {
            steps {
                sh 'npm install'
                // Optional: sh 'npm run build' (if using TS or a framework)
            }
        }

        // Stage 2: Build the Docker Image
        stage('Docker Image Build') {
            steps {
                sh "docker build --no-cache -t ${IMAGE_NAME} ."
            }
        }

        // Stage 3: Clean up old container and Run the new one
        stage('Docker Deploy') {
            steps {
                script {
                    // Remove the old container if it exists
                    sh "docker rm -f ${CONTAINER_NAME} || true"

                    // Start the new container
                    sh "docker run -d --name ${CONTAINER_NAME} -p ${HOST_PORT}:${APP_PORT} ${IMAGE_NAME}"
                }
            }
        }
    }

    post {
        success {
            echo "Successfully deployed to http://localhost:${HOST_PORT}"
        }
        always {
            sh 'docker image prune -f'
        }
    }
}